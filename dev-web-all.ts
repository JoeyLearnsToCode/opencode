import { $ } from "bun"

// `--port 0` means: prefer 4096, fall back to OS-assigned random port
const backend = Bun.spawn(
  ["bun", "run", "--cwd", "packages/opencode", "--conditions=browser", "src/index.ts", "serve", "--port", "0"],
  {
    env: { ...process.env, OPENCODE_CHANNEL: "dev" },
    stdio: ["inherit", "pipe", "inherit"],
  },
)

// Read backend stdout until we discover the actual listening port,
// while also forwarding all output to the terminal.
const decoder = new TextDecoder()
let port = ""

const stdoutReader = backend.stdout.getReader()
;(async () => {
  while (true) {
    const { done, value } = await stdoutReader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    process.stdout.write(text)
    if (!port) {
      const m = text.match(/listening on http:\/\/[^:]+:(\d+)/)
      if (m) port = m[1]
    }
  }
})()

while (!port) await Bun.sleep(100)

const frontend = Bun.spawn(
  ["bun", "run", "--cwd", "packages/app", "dev", "--", "--port", "4444"],
  {
    env: { ...process.env, VITE_OPENCODE_SERVER_PORT: port },
    stdio: ["inherit", "inherit", "inherit"],
  },
)

await frontend.exited
backend.kill()

export {}
