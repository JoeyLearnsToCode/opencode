// Static UI assets the browser fetches without app-managed credentials, e.g.
// the manifest link in <head>. These bypass auth so the page can install/render
// the manifest icons even when a server password is configured.
// Assets under /assets/ (Vite build output) must also be public because the
// browser loads them as subresources without the auth_token query param that
// was present on the initial HTML request.
export const PUBLIC_UI_PATHS = new Set<string>([
  "/site.webmanifest",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/favicon-96x96-v3.png",
  "/favicon-v3.svg",
  "/favicon-v3.ico",
  "/apple-touch-icon-v3.png",
  "/social-share.png",
  "/login",
])

export function isPublicUIPath(method: string, pathname: string) {
  if (method !== "GET") return false
  if (PUBLIC_UI_PATHS.has(pathname)) return true
  // Vite/SolidJS bundles static assets under /assets/
  if (pathname.startsWith("/assets/")) return true
  return false
}
