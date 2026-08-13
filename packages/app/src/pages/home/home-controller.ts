import { type GlobalSession } from "@opencode-ai/sdk/v2/client"
import { useQuery } from "@tanstack/solid-query"
import { useGlobal } from "@/context/global"
import { type HomeProjectSelection, type LocalProject, useLayout } from "@/context/layout"
import { ServerConnection, useServer } from "@/context/server"
import { useServerSync } from "@/context/server-sync"
import { useTabs } from "@/context/tabs"
import { toggleHomeProjectSelection } from "@/pages/layout/helpers"
import { pathKey } from "@/utils/path-key"
import { createEffect, createMemo } from "solid-js"

export function createHomeController() {
  const sync = useServerSync()
  const layout = useLayout()
  const server = useServer()
  const global = useGlobal()
  const tabs = useTabs()
  const selection = layout.home.selection
  const focusedServer = createMemo(
    () => global.servers.list().find((conn) => ServerConnection.key(conn) === selection().server) ?? server.current,
  )
  const focusedServerCtx = createMemo(() => {
    const conn = focusedServer()
    if (!conn) return undefined
    return global.ensureServerCtx(conn)
  })
  const focusedSync = () => focusedServerCtx()?.sync ?? sync()
  const serverKey = () => {
    const conn = focusedServer()
    return conn ? ServerConnection.key(conn) : ""
  }
  const experimentalLoad = useQuery(() => ({
    queryKey: [serverKey(), "experimental", "sessions"],
    enabled: !!focusedServerCtx(),
    queryFn: async ({ signal }) => {
      const ctx = focusedServerCtx()
      if (!ctx) return []
      const all: GlobalSession[] = []
      let cursor: number | undefined
      do {
        const res = await ctx.sdk.client.experimental.session.list(
          { cursor, limit: 200, archived: false },
          { signal, throwOnError: false },
        )
        if (res.data) all.push(...res.data)
        const next = res.response.headers.get("x-next-cursor")
        cursor = next ? Number(next) : undefined
      } while (cursor)
      return all
    },
    staleTime: 60_000,
  }))
  const experimentalProjects = createMemo(() => {
    const sessions = experimentalLoad.data
    if (!sessions) return undefined
    const closed = new Set((focusedServerCtx()?.projects.closedWorktrees() ?? []).map(pathKey))
    const seen = new Set<string>()
    const syncProjects = focusedSync().data.project ?? []
    const metadata = new Map(syncProjects.map((p) => [pathKey(p.worktree), p]))
    const result: LocalProject[] = []
    for (const session of sessions) {
      const p = session.project
      if (!p?.worktree) continue
      const key = pathKey(p.worktree)
      if (closed.has(key) || seen.has(key)) continue
      seen.add(key)
      const meta = metadata.get(key)
      result.push({
        ...meta,
        id: p.id,
        name: p.name ?? meta?.name,
        worktree: p.worktree,
        expanded: true,
      })
    }
    return result
  })
  const projects = createMemo(() => {
    if (experimentalLoad.data && experimentalProjects()) return experimentalProjects()!
    return focusedServerCtx()?.projects.list() ?? layout.projects.list()
  })
  const recentlyClosed = createMemo(
    () => focusedServerCtx()?.projects.recentlyClosed() ?? layout.projects.recentlyClosed(),
  )
  const homedir = createMemo(() => focusedSync().data.path.home ?? "")
  const selectedProject = createMemo(() => projects().find((project) => project.worktree === selection().directory))
  const newSessionProject = createMemo(
    () =>
      selectedProject() ??
      projects().find((project) => project.worktree === focusedServerCtx()?.projects.last()) ??
      projects()[0],
  )

  createEffect(() => {
    const list = global.servers.list()
    if (list.some((conn) => ServerConnection.key(conn) === selection().server)) return
    const conn = list.find((conn) => ServerConnection.key(conn) === server.key) ?? list[0]
    if (conn) setSelection({ server: ServerConnection.key(conn) })
  })

  function setSelection(next: HomeProjectSelection) {
    layout.home.setSelection(next)
  }

  function openProjectNewSession(conn: ServerConnection.Any, directory: string) {
    const ctx = global.ensureServerCtx(conn)
    ctx.projects.open(directory)
    ctx.projects.touch(directory)
    void tabs.newDraft({ server: ServerConnection.key(conn), directory })
  }

  return {
    selection: {
      value: selection,
      set: setSelection,
      focusServer: (conn: ServerConnection.Any) => setSelection({ server: ServerConnection.key(conn) }),
    },
    server: {
      list: global.servers.list,
      health: (conn: ServerConnection.Any) => global.servers.health[ServerConnection.key(conn)],
      context: (conn: ServerConnection.Any) => global.ensureServerCtx(conn),
      focused: focusedServer,
      focusedContext: focusedServerCtx,
      focusedSync,
    },
    project: {
      list: projects,
      recentlyClosed,
      homedir,
      selected: selectedProject,
      newSession: newSessionProject,
      forServer: (conn: ServerConnection.Any) => global.ensureServerCtx(conn).projects.list(),
      select: (conn: ServerConnection.Any, directory: string) => {
        const key = ServerConnection.key(conn)
        if (global.servers.health[key]?.healthy === false) return
        if (!projects().some((project) => project.worktree === directory)) return
        setSelection(toggleHomeProjectSelection(selection(), key, directory))
      },
      add: (conn: ServerConnection.Any, directories: string[]) => {
        const directory = directories[0]
        if (!directory) return
        const ctx = global.ensureServerCtx(conn)
        directories.forEach((item) => {
          if (ctx.projects.list().some((project) => project.worktree === item)) return
          const location = { directory: item }
          void ctx.sdk.api.file
            .list({ path: ".", location })
            .then(async (files) => {
              if (files.data.length > 0) return ctx.sdk.api.project.current({ location })
              const result = await ctx.sdk.client.project.initGit({ directory: item })
              return result.data ?? ctx.sdk.api.project.current({ location })
            })
            .then((project) => ctx.sync.child(item, { bootstrap: false })[1]("project", project.id))
            .catch(() => undefined)
          ctx.projects.open(item)
        })
        ctx.projects.touch(directory)
        setSelection({ server: ServerConnection.key(conn), directory })
      },
      openNewSession: () => {
        const conn = focusedServer()
        const project = newSessionProject()
        if (!conn || !project) return
        openProjectNewSession(conn, project.worktree)
      },
      openProjectNewSession,
    },
  }
}

export type HomeController = ReturnType<typeof createHomeController>
