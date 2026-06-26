import { type GlobalSession } from "@opencode-ai/sdk/v2/client"
import { createQuery, useQueryClient } from "@tanstack/solid-query"
import { createEffect, onCleanup } from "solid-js"
import { useServerSDK } from "./server-sdk"

export function useExperimentalSessions() {
  const serverSDK = useServerSDK()
  const queryClient = useQueryClient()
  const scope = () => serverSDK().scope

  const query = createQuery(() => ({
    queryKey: [scope(), "experimental", "sessions"],
    queryFn: async () => {
      const all: GlobalSession[] = []
      let cursor: string | undefined
      do {
        const res = await serverSDK().client.experimental.session.list(
          { cursor: cursor ? Number(cursor) : undefined, limit: 200, archived: false },
          { throwOnError: false },
        )
        if (res.data) all.push(...res.data)
        const next = res.response.headers.get("x-next-cursor")
        cursor = next ?? undefined
      } while (cursor)
      return { sessions: all }
    },
    staleTime: 60_000,
  }))

  createEffect(() => {
    const s = scope()
    const sdk = serverSDK()
    const cleanup = sdk.event.listen((e) => {
      const event = e.details
      if (
        event.type === "session.created" ||
        event.type === "session.updated" ||
        event.type === "session.deleted"
      ) {
        queryClient.invalidateQueries({ queryKey: [s, "experimental", "sessions"] })
      }
    })
    onCleanup(cleanup)
  })

  return query
}
