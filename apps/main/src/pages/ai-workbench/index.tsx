import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/common/PageHeader'
import { assistantCatalog, createMockAiReply, seedWorkbenchSessions, type AssistantOption, type WorkbenchMessage, type WorkbenchSession } from '../../services/mockApi'
import { ContextPanel } from './components/ContextPanel'
import { ConversationPanel } from './components/ConversationPanel'
import { SessionSidebar } from './components/SessionSidebar'
import { aiWorkbenchTestUtils } from './markdown'
import { buildHistoricalMessages, getAssistantName } from './utils'

export { aiWorkbenchTestUtils }

export default function AIWorkbenchPage() {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<WorkbenchSession[]>(seedWorkbenchSessions)
  const [activeSessionId, setActiveSessionId] = useState(seedWorkbenchSessions[0].id)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [contextEnabled, setContextEnabled] = useState(true)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [assistantId, setAssistantId] = useState<AssistantOption['id']>(seedWorkbenchSessions[0].assistantId)
  const [switchMode, setSwitchMode] = useState<'current' | 'new'>('current')
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [historyLoadedIds, setHistoryLoadedIds] = useState<string[]>([])
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stopStreamRef = useRef(false)
  const resizingRef = useRef(false)
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0]
  const currentAssistant = assistantCatalog.find((item) => item.id === assistantId) ?? assistantCatalog[0]

  const contextSummary = useMemo(
    () =>
      t('aiWorkbench.contextSummary', {
        assistant: getAssistantName(t, currentAssistant),
        title: activeSession?.title ?? t('aiWorkbench.untitledSession')
      }),
    [activeSession?.title, currentAssistant, t]
  )

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) {
      return sessions
    }

    return sessions.filter((session) => {
      return session.title.toLowerCase().includes(keyword) || session.messages.some((message) => message.content.toLowerCase().includes(keyword))
    })
  }, [search, sessions])

  useEffect(() => {
    if (!activeSession) {
      return
    }

    setAssistantId(activeSession.assistantId)
  }, [activeSession])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeSession?.messages, streaming])

  const loadOlderMessages = (sessionId: string) => {
    if (historyLoadedIds.includes(sessionId) || historyLoadingId === sessionId) {
      return
    }

    const session = sessions.find((item) => item.id === sessionId)
    if (!session) {
      return
    }

    setHistoryLoadingId(sessionId)
    window.setTimeout(() => {
      setSessions((state) =>
        state.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                messages: [...buildHistoricalMessages(t, item), ...item.messages]
              }
            : item
        )
      )
      setHistoryLoadedIds((state) => [...state, sessionId])
      setHistoryLoadingId((current) => (current === sessionId ? null : current))
    }, 220)
  }

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) {
        return
      }
      setSidebarWidth(Math.min(420, Math.max(260, event.clientX - 24)))
    }

    const onMouseUp = () => {
      resizingRef.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const updateSession = (sessionId: string, updater: (session: WorkbenchSession) => WorkbenchSession) => {
    setSessions((state) => state.map((session) => (session.id === sessionId ? updater(session) : session)))
  }

  const createSession = (seed?: Partial<WorkbenchSession>) => {
    const nextSession: WorkbenchSession = {
      id: `session-${Date.now()}`,
      title: seed?.title ?? t('aiWorkbench.newSessionTitle', { index: sessions.length + 1 }),
      assistantId: seed?.assistantId ?? assistantId,
      updatedAt: t('aiWorkbench.timestamps.justNow'),
      messages: seed?.messages ?? []
    }
    setSessions((state) => [nextSession, ...state])
    setActiveSessionId(nextSession.id)
    return nextSession
  }

  const handleSwitchAssistant = (nextAssistantId: AssistantOption['id']) => {
    setAssistantId(nextAssistantId)
    if (switchMode === 'current' && activeSession) {
      updateSession(activeSession.id, (session) => ({ ...session, assistantId: nextAssistantId, updatedAt: t('aiWorkbench.timestamps.justNow') }))
      return
    }

    createSession({
      assistantId: nextAssistantId,
      title: t('aiWorkbench.assistantSessionTitle', {
        assistant: getAssistantName(t, assistantCatalog.find((item) => item.id === nextAssistantId) ?? assistantCatalog[0])
      })
    })
  }

  const handleDeleteSession = (sessionId: string) => {
    const nextSessions = sessions.filter((session) => session.id !== sessionId)
    setSessions(nextSessions)
    if (activeSessionId === sessionId && nextSessions.length > 0) {
      setActiveSessionId(nextSessions[0].id)
    }
  }

  const streamAssistantReply = async (sessionId: string, prompt: string) => {
    stopStreamRef.current = false
    const reply = createMockAiReply(prompt, assistantId, contextEnabled, contextSummary)
    const assistantMessageId = `assistant-${Date.now()}`
    updateSession(sessionId, (session) => ({
      ...session,
      updatedAt: t('aiWorkbench.timestamps.justNow'),
      messages: [...session.messages, { id: assistantMessageId, role: 'assistant', content: '', createdAt: t('aiWorkbench.timestamps.justNow') }]
    }))
    setStreaming(true)

    for (let index = 0; index < reply.length; index += 1) {
      if (stopStreamRef.current) {
        break
      }
      const partial = reply.slice(0, index + 1)
      updateSession(sessionId, (session) => ({
        ...session,
        updatedAt: t('aiWorkbench.timestamps.justNow'),
        messages: session.messages.map((message) => (message.id === assistantMessageId ? { ...message, content: partial } : message))
      }))
      await new Promise((resolve) => window.setTimeout(resolve, 12))
    }

    setStreaming(false)
  }

  const handleSend = async () => {
    if (!draft.trim() || !activeSession) {
      return
    }

    const prompt = draft.trim()
    const message: WorkbenchMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: t('aiWorkbench.timestamps.justNow')
    }

    updateSession(activeSession.id, (session) => ({
      ...session,
      updatedAt: t('aiWorkbench.timestamps.justNow'),
      messages: [...session.messages, message],
      title: session.messages.length <= 1 ? prompt.slice(0, 16) : session.title
    }))
    setDraft('')
    await streamAssistantReply(activeSession.id, prompt)
  }

  const handleStop = () => {
    stopStreamRef.current = true
    setStreaming(false)
    toast.info(t('aiWorkbench.stopSuccess'))
  }

  const handleRegenerate = async () => {
    if (!activeSession) {
      return
    }
    const lastUser = [...activeSession.messages].reverse().find((message) => message.role === 'user')
    if (!lastUser) {
      return
    }
    updateSession(activeSession.id, (session) => ({ ...session, messages: session.messages.filter((message) => message.role !== 'assistant' || message.id !== session.messages.at(-1)?.id) }))
    await streamAssistantReply(activeSession.id, lastUser.content)
  }

  const handleCopy = async (message: WorkbenchMessage) => {
    await navigator.clipboard.writeText(message.content)
    toast.success(t('aiWorkbench.copySuccess'))
  }

  const setScrollContainer = (node: HTMLDivElement | null) => {
    scrollRef.current = node
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('aiWorkbench.eyebrow')}
        title={t('aiWorkbench.title')}
        description={t('aiWorkbench.overviewDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={assistantId} onValueChange={(value) => handleSwitchAssistant(value as AssistantOption['id'])}>
              <SelectTrigger className="min-w-[13rem] bg-white/50 backdrop-blur-xl dark:bg-slate-900/35">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assistantCatalog.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {getAssistantName(t, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={switchMode} onValueChange={(value) => setSwitchMode(value as 'current' | 'new')}>
              <SelectTrigger className="min-w-[10rem] bg-white/50 backdrop-blur-xl dark:bg-slate-900/35">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">{t('aiWorkbench.switchMode.current')}</SelectItem>
                <SelectItem value="new">{t('aiWorkbench.switchMode.new')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => createSession()}>
              <MessageSquarePlus className="size-4" />
              {t('aiWorkbench.newSession')}
            </Button>
          </div>
        }
      />

        <div className="relative flex min-h-[42rem] overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-white/30 backdrop-blur-md dark:bg-slate-950/25">
          <SessionSidebar
            sidebarWidth={sidebarWidth}
            search={search}
            setSearch={setSearch}
            filteredSessions={filteredSessions}
            activeSessionId={activeSessionId}
            renameId={renameId}
            setRenameId={setRenameId}
            setActiveSessionId={setActiveSessionId}
            updateSession={updateSession}
            handleDeleteSession={handleDeleteSession}
          />

        <div
          aria-label="resize sessions panel"
          className="relative hidden w-3 cursor-col-resize bg-transparent lg:block"
          onMouseDown={() => {
            resizingRef.current = true
          }}
          role="separator"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[hsl(var(--border))]" />
          <div className="absolute left-1/2 top-1/2 flex h-10 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] text-muted-foreground shadow-sm">
            <span className="text-sm">||</span>
          </div>
        </div>

          <div className="grid h-full min-w-0 flex-1 gap-0 xl:grid-cols-[1.35fr_0.65fr]">
            <ConversationPanel
              activeSession={activeSession}
              currentAssistant={currentAssistant}
              historyLoadedIds={historyLoadedIds}
              historyLoadingId={historyLoadingId}
              loadOlderMessages={loadOlderMessages}
              updateSession={updateSession}
              handleRegenerate={handleRegenerate}
              handleCopy={handleCopy}
              draft={draft}
              setDraft={setDraft}
              handleSend={handleSend}
              handleStop={handleStop}
              streaming={streaming}
              setScrollContainer={setScrollContainer}
            />

            <ContextPanel
              contextEnabled={contextEnabled}
              setContextEnabled={setContextEnabled}
              contextSummary={contextSummary}
            />
          </div>
        </div>
      </div>
  )
}
