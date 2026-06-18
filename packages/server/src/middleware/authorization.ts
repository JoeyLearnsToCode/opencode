import { ServerAuth } from "../auth"
import { UnauthorizedError } from "../errors"
import { hasPtyConnectTicketURL } from "../groups/pty"
import { Effect, Encoding, Layer, Redacted } from "effect"
import { HttpEffect, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"

const AUTH_TOKEN_QUERY = "auth_token"
const AUTH_TOKEN_COOKIE = "authToken"
const WWW_AUTHENTICATE = 'Basic realm="Secure Area"'
const COOKIE_MAX_AGE = 86_400

export class Authorization extends HttpApiMiddleware.Service<Authorization>()("@opencode/HttpApiAuthorization", {
  error: UnauthorizedError,
}) {}

function emptyCredential() {
  return { username: "", password: Redacted.make("") }
}

function decodeCredential(input: string) {
  return Effect.fromResult(Encoding.decodeBase64String(input)).pipe(
    Effect.match({
      onFailure: emptyCredential,
      onSuccess: (header) => {
        const separator = header.indexOf(":")
        if (separator === -1) return emptyCredential()
        return { username: header.slice(0, separator), password: Redacted.make(header.slice(separator + 1)) }
      },
    }),
  )
}

function encodeCredential(credential: ServerAuth.DecodedCredentials): string {
  return Encoding.encodeBase64(new TextEncoder().encode(`${credential.username}:${Redacted.value(credential.password)}`))
}

function credentialFromCookie(request: HttpServerRequest.HttpServerRequest) {
  const cookieHeader = request.headers.cookie ?? request.headers.Cookie
  if (!cookieHeader) return Effect.succeed(emptyCredential())
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name !== AUTH_TOKEN_COOKIE) continue
    const value = part.slice(eq + 1).trim()
    if (value) return decodeCredential(value)
  }
  return Effect.succeed(emptyCredential())
}

function credentialFromRequest(request: HttpServerRequest.HttpServerRequest) {
  const url = new URL(request.url, "http://localhost")
  const token = url.searchParams.get(AUTH_TOKEN_QUERY)
  if (token) return decodeCredential(token)
  const match = /^Basic\s+(.+)$/i.exec(request.headers.authorization ?? "")
  if (match) return decodeCredential(match[1])
  return credentialFromCookie(request)
}

function credentialToCookie(credential: ServerAuth.DecodedCredentials) {
  const encoded = encodeCredential(credential)
  return `${AUTH_TOKEN_COOKIE}=${encoded}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`
}

export const authorizationLayer = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const config = yield* ServerAuth.Config
    if (!ServerAuth.required(config)) return Authorization.of((effect) => effect)
    return Authorization.of((effect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        // Browsers cannot set headers on WebSocket upgrades, so a ticketed PTY connect skips
        // credential checks here; the connect handler consumes and validates the ticket.
        if (hasPtyConnectTicketURL(new URL(request.url, "http://localhost"))) return yield* effect
        const credential = yield* credentialFromRequest(request)
        if (ServerAuth.authorized(credential, config)) {
          yield* HttpEffect.appendPreResponseHandler((_request, response) =>
            Effect.succeed(HttpServerResponse.setHeader(response, "Set-Cookie", credentialToCookie(credential))),
          )
          return yield* effect
        }
        yield* HttpEffect.appendPreResponseHandler((_request, response) =>
          Effect.succeed(HttpServerResponse.setHeader(response, "www-authenticate", WWW_AUTHENTICATE)),
        )
        return yield* new UnauthorizedError({ message: "Authentication required" })
      }),
    )
  }),
)
