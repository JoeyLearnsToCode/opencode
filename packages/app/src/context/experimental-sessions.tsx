import { type GlobalSession } from "@opencode-ai/sdk/v2/client"
import { createQuery, type QueryClient, useQueryClient } from "@tanstack/solid-query"
import { createEffect, createRoot, onCleanup } from "solid-js"
import { useServerSDK, type ServerSDK } from "./server-sdk"

function setupSessionListener(serverSDK: () => ServerSDK, queryClient: QueryClient) {
  createEffect(() => {
    const s = serverSDK().scope
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
}

let listenerCleanup: (() => void) | undefined

export function useExperimentalSessions() {
  const serverSDK = useServerSDK()
  const queryClient = useQueryClient()
  const scope = () => serverSDK().scope

  if (!listenerCleanup) {
    createRoot((dispose) => {
      listenerCleanup = dispose
      setupSessionListener(serverSDK, queryClient)
    })
  }

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

  return query
}
