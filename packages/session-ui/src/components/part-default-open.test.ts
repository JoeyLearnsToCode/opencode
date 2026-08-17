import { describe, expect, test } from "bun:test"
import { hasAutoDiffPart, partDefaultOpen } from "./part-default-open"
import type { Part as PartType, ToolPart } from "@opencode-ai/sdk/v2"

describe("partDefaultOpen", () => {
  test("keeps edited files expanded when enabled", () => {
    expect(partDefaultOpen(tool("edit", { filediff: { additions: 1, deletions: 1 } }), false, true)).toBe(true)
  })

  test("collapses deletion-only edits when enabled", () => {
    expect(partDefaultOpen(tool("edit", { filediff: { additions: 0, deletions: 1_200 } }), false, true)).toBe(false)
  })

  test("collapses patches containing only deleted files when enabled", () => {
    expect(
      partDefaultOpen(
        tool("apply_patch", {
          files: [
            { filePath: "one.ts", type: "delete" },
            { filePath: "two.ts", type: "delete" },
          ],
        }),
        false,
        true,
      ),
    ).toBe(false)
  })

  test("keeps mixed patches expanded when enabled", () => {
    expect(
      partDefaultOpen(
        tool("apply_patch", {
          files: [
            { filePath: "one.ts", type: "delete" },
            { filePath: "two.ts", type: "update" },
          ],
        }),
        false,
        true,
      ),
    ).toBe(true)
  })

  test("preserves shell defaults", () => {
    expect(partDefaultOpen(tool("shell", {}), true, false)).toBe(true)
  })

  test("keeps auto-diff tools expanded when enabled", () => {
    expect(partDefaultOpen(tool("hashline_edit", { diff: "@@ -1 +1 @@\n-x\n+y\n" }, { filePath: "a.ts" }), false, true)).toBe(true)
  })

  test("collapses auto-diff tools when disabled", () => {
    expect(partDefaultOpen(tool("hashline_edit", { diff: "@@ -1 +1 @@\n-x\n+y\n" }, { filePath: "a.ts" }), false, false)).toBe(false)
  })
})

describe("hasAutoDiffPart", () => {
  test("detects metadata diff with filePath input", () => {
    expect(hasAutoDiffPart(tool("hashline_edit", { diff: "@@ -1 +1 @@\n-x\n+y\n" }, { filePath: "a.ts" }))).toBe(true)
  })

  test("supports path input", () => {
    expect(hasAutoDiffPart(tool("hashline_edit", { diff: "@@ -1 +1 @@\n-x\n+y\n" }, { path: "a.ts" }))).toBe(true)
  })

  test("rejects parts without diff metadata", () => {
    expect(hasAutoDiffPart(tool("hashline_edit", { operationCount: 2 }, { filePath: "a.ts" }))).toBe(false)
  })

  test("rejects parts without a file path", () => {
    expect(hasAutoDiffPart(tool("hashline_edit", { diff: "@@ -1 +1 @@\n-x\n+y\n" }))).toBe(false)
  })

  test("rejects non-edit tool names", () => {
    expect(hasAutoDiffPart(tool("some_tool", { diff: "@@ -1 +1 @@\n-x\n+y\n" }, { filePath: "a.ts" }))).toBe(false)
  })

  test("rejects pending parts", () => {
    const part: PartType = {
      id: "part_pending",
      sessionID: "session",
      messageID: "message",
      type: "tool",
      callID: "call_pending",
      tool: "hashline_edit",
      state: { status: "pending", input: { filePath: "a.ts" }, raw: "" },
    }
    expect(hasAutoDiffPart(part)).toBe(false)
  })
})

function tool(
  name: string,
  metadata: Record<string, unknown>,
  input: Record<string, unknown> = {},
): ToolPart {
  return {
    id: `part_${name}`,
    sessionID: "session",
    messageID: "message",
    type: "tool",
    callID: `call_${name}`,
    tool: name,
    state: {
      status: "completed",
      input,
      output: "",
      title: name,
      metadata,
      time: { start: 0, end: 1 },
    },
  }
}
