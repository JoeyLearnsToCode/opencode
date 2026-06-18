import { type GlobalSession } from "@opencode-ai/sdk/v2/client"
import { createQuery } from "@tanstack/solid-query"
import { useServerSDK } from "./server-sdk"

export function useExperimentalSessions() {
  const serverSDK = useServerSDK()
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

  return query
}
