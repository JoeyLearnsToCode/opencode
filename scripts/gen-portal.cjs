const fs = require("fs")
const path = require("path")

const src = "D:\\c-free\\joeylwang\\scoop\\persist\\nginx\\conf\\sites-enabled\\opencode-portal.html"
const dest = "D:\\open-source\\opencode\\packages\\opencode\\src\\server\\routes\\instance\\httpapi\\portal.ts"

const html = fs.readFileSync(src, "utf8")

// Escape for TS template literal: ` -> \`, ${ -> \${, \ -> \\
const escaped = html
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${")

const content = [
  `import { Effect, Layer, lazy } from "effect"`,
  `import { HttpRouter, HttpServerResponse } from "effect/unstable/http"`,
  ``,
  `const portalHtml = \`${escaped}\``,
  ``,
  `const portalResponse = lazy(() =>`,
  `  HttpServerResponse.raw(portalHtml, {`,
  `    headers: { "content-type": "text/html; charset=utf-8" },`,
  `  }),`,
  `)`,
  ``,
  `export const portalRoute = HttpRouter.use((router) =>`,
  `  Effect.gen(function* () {`,
  `    yield* router.add("GET", "/home", () => Effect.succeed(portalResponse()))`,
  `    yield* router.add("GET", "/portal", () => Effect.succeed(portalResponse()))`,
  `  }),`,
  `)`,
  ``,
].join("\n")

fs.writeFileSync(dest, content, "utf8")
console.log("Written", content.length, "bytes to", dest)
