import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Copy, MessageSquarePlus, Pencil, Search, Sparkles, Square, Trash2, Wand2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/common/PageHeader'
import { assistantCatalog, createMockAiReply, seedWorkbenchSessions, type AssistantOption, type WorkbenchMessage, type WorkbenchSession } from '../../services/mockApi'

type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; code: string }

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`${segment}-${index}`} className="font-semibold text-foreground">{segment.slice(2, -2)}</strong>
    }

    return <span key={`${segment}-${index}`}>{segment}</span>
  })
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', code: codeLines.join('\n') })
      index += 1
      continue
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const current = lines[index].trim()
      if (!current || current.startsWith('```') || /^-\s+/.test(current) || /^\d+\.\s+/.test(current)) {
        break
      }
      paragraphLines.push(current)
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

function renderMarkdownBlocks(content: string) {
  return parseMarkdownBlocks(content).map((block, index) => {
    if (block.type === 'code') {
      return (
        <pre key={`code-${index}`} className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-slate-950/90 px-4 py-3 text-[12px] text-slate-100">
          <code>{block.code}</code>
        </pre>
      )
    }

    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag key={`list-${index}`} className={block.ordered ? 'list-decimal space-y-2 pl-5' : 'list-disc space-y-2 pl-5'}>
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </Tag>
      )
    }

    return (
      <p key={`paragraph-${index}`} className="leading-6">
        {renderInlineMarkdown(block.text)}
      </p>
    )
  })
}

function getAssistantName(t: (key: string, options?: Record<string, unknown>) => string, option: AssistantOption) {
  return t(`aiWorkbench.assistants.${option.id}.name`, { defaultValue: option.name })
}

function getAssistantDescription(t: (key: string, options?: Record<string, unknown>) => string, option: AssistantOption) {
  return t(`aiWorkbench.assistants.${option.id}.description`, { defaultValue: option.description })
}

function formatAssistantLabel(t: (key: string, options?: Record<string, unknown>) => string, option: AssistantOption) {
  return `${getAssistantName(t, option)} · ${getAssistantDescription(t, option)}`
}

function buildHistoricalMessages(
  t: (key: string, options?: Record<string, unknown>) => string,
  session: WorkbenchSession
): WorkbenchMessage[] {
  const assistant = assistantCatalog.find((item) => item.id === session.assistantId) ?? assistantCatalog[0]
  return [
    {
      id: `${session.id}-history-user-1`,
      role: 'user',
      content: t('aiWorkbench.history.userPrompt', { title: session.title }),
      createdAt: t('aiWorkbench.timestamps.earlier')
    },
    {
      id: `${session.id}-history-assistant-1`,
      role: 'assistant',
      content: t('aiWorkbench.history.assistantReply', { assistant: getAssistantName(t, assistant) }),
      createdAt: t('aiWorkbench.timestamps.earlier')
    },
    {
      id: `${session.id}-history-assistant-2`,
      role: 'assistant',
      content: t('aiWorkbench.history.checklist'),
      createdAt: t('aiWorkbench.timestamps.earlier')
    }
  ]
}

export function aiWorkbenchTestUtils() {
  return {
    parseMarkdownBlocks
  }
}

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
        <div className="flex h-full flex-col border-r border-[hsl(var(--border))] bg-[var(--card-surface)]/70" style={{ width: sidebarWidth }}>
            <div className="border-b border-[hsl(var(--border))] p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white/50 px-3 dark:bg-slate-900/35">
                <Search className="size-4 text-muted-foreground" />
                <Input className="border-none bg-transparent shadow-none focus-visible:ring-0" placeholder={t('aiWorkbench.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-3">
                {filteredSessions.map((session) => {
                  const assistant = assistantCatalog.find((item) => item.id === session.assistantId) ?? assistantCatalog[0]
                  const active = session.id === activeSessionId
                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-transparent bg-[linear-gradient(135deg,color-mix(in_hsl,hsl(var(--primary))_20%,white),color-mix(in_hsl,hsl(var(--secondary))_16%,transparent))] shadow-md' : 'border-[hsl(var(--border))] bg-white/40 hover:bg-white/55 dark:bg-slate-900/35 dark:hover:bg-slate-900/50'}`}
                      onClick={() => setActiveSessionId(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setActiveSessionId(session.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {renameId === session.id ? (
                            <Input
                              autoFocus
                              className="h-8 bg-white/80 dark:bg-slate-900/50"
                              defaultValue={session.title}
                              onBlur={(event) => {
                                updateSession(session.id, (item) => ({ ...item, title: event.target.value || item.title }))
                                setRenameId(null)
                              }}
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <div className="truncate text-sm font-semibold text-foreground">{session.title}</div>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{getAssistantName(t, assistant)}</Badge>
                            <span>{session.updatedAt}</span>
                          </div>
                        </div>
                        <Bot className="size-4 shrink-0" style={{ color: assistant.color }} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <button className="inline-flex items-center gap-1" onClick={(event) => { event.stopPropagation(); setRenameId(session.id) }} type="button">
                              <Pencil className="size-4" />
                              {t('aiWorkbench.rename')}
                            </button>
                        <button className="inline-flex items-center gap-1" onClick={(event) => { event.stopPropagation(); handleDeleteSession(session.id) }} type="button">
                          <Trash2 className="size-4" />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

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
            <div className="flex h-full flex-col border-r border-[hsl(var(--border))]">
              <div className="border-b border-[hsl(var(--border))] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-white/45 p-4 backdrop-blur-xl dark:bg-slate-900/35">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{activeSession?.title}</div>
                     <div className="mt-1 text-sm text-muted-foreground">{formatAssistantLabel(t, currentAssistant)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleRegenerate()}>
                      <Wand2 className="size-4" />
                      {t('aiWorkbench.regenerate')}
                    </Button>
                    <Button variant="outline" onClick={() => activeSession && updateSession(activeSession.id, (session) => ({ ...session, messages: [] }))}>
                      <Trash2 className="size-4" />
                      {t('aiWorkbench.clearConversation')}
                    </Button>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex justify-center">
                  {!activeSession || historyLoadedIds.includes(activeSession.id) ? (
                      <div className="text-sm text-muted-foreground">{t('aiWorkbench.historyStart')}</div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={historyLoadingId === activeSession.id}
                      onClick={() => loadOlderMessages(activeSession.id)}
                    >
                      {historyLoadingId === activeSession.id ? t('common.loading') : t('aiWorkbench.loadOlder')}
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  {(activeSession?.messages ?? []).map((message) => (
                    <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[82%]' : 'max-w-[86%]'}>
                      <div
                        className={
                          message.role === 'user'
                            ? 'rounded-xl rounded-br-md bg-[linear-gradient(135deg,hsl(var(--primary)),color-mix(in_hsl,hsl(var(--secondary))_70%,white))] px-5 py-4 text-sm text-white shadow-primary-md'
                            : 'rounded-xl rounded-bl-md border border-[hsl(var(--border))] bg-white/55 px-5 py-4 text-sm text-muted-foreground backdrop-blur-xl dark:bg-slate-900/40'
                        }
                      >
                        <div className="space-y-2">{renderMarkdownBlocks(message.content)}</div>
                        <div className={`mt-3 flex items-center justify-between text-sm ${message.role === 'user' ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <span>{message.createdAt}</span>
                          <div className="flex items-center gap-3">
                            <button className="inline-flex items-center gap-1" onClick={() => void handleCopy(message)} type="button">
                              <Copy className="size-4" />
                              {t('common.copy')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[hsl(var(--border))] p-5">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-white/50 p-4 backdrop-blur-xl dark:bg-slate-900/35">
                  <Textarea
                    className="min-h-[7rem] border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                    placeholder={t('aiWorkbench.promptPlaceholder')}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend()
                      }
                    }}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t('aiWorkbench.sendHint')}</div>
                    <div className="flex flex-wrap gap-2">
                      {streaming ? (
                        <Button variant="outline" onClick={handleStop}>
                          <Square className="size-4" />
                          {t('aiWorkbench.stop')}
                        </Button>
                      ) : null}
                      <Button onClick={() => void handleSend()}>
                        <Sparkles className="size-4" />
                        {t('aiWorkbench.generate')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col bg-[color-mix(in_hsl,hsl(var(--primary))_4%,transparent)]/40 p-5">
              <Card className="theme-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-lg">
                    <span>{t('aiWorkbench.contextAttachment')}</span>
                    <Switch checked={contextEnabled} onCheckedChange={setContextEnabled} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-white/45 p-4 dark:bg-slate-900/35">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{t('aiWorkbench.contextStatus')}</div>
                      <Badge variant={contextEnabled ? 'success' : 'outline'}>{contextEnabled ? t('aiWorkbench.contextEnabled') : t('aiWorkbench.contextDisabled')}</Badge>
                    </div>
                    <p className="mt-3 leading-6">{t('aiWorkbench.contextStatusDescription')}</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-white/35 p-4 dark:bg-slate-900/20">
                    <div className="eyebrow-text">{t('aiWorkbench.contextPreview')}</div>
                    <div className="mt-3 leading-6">{contextSummary}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="theme-card mt-4 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">{t('aiWorkbench.assistantGuide')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {assistantCatalog.map((assistant) => (
                    <div key={assistant.id} className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-foreground">{getAssistantName(t, assistant)}</div>
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: assistant.color }} />
                      </div>
                      <p className="mt-2 leading-6">{getAssistantDescription(t, assistant)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
    </div>
  )
}
