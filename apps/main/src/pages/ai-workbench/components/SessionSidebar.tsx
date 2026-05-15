import { Bot, Pencil, Search, Trash2 } from 'lucide-react';
import { Badge, Input, ScrollArea } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { assistantCatalog, type WorkbenchSession } from '../../../services/mockApi';
import { getAssistantName } from '../utils';

interface SessionSidebarProps {
  sidebarWidth: number;
  search: string;
  setSearch: (value: string) => void;
  filteredSessions: WorkbenchSession[];
  activeSessionId: string;
  renameId: string | null;
  setRenameId: (value: string | null) => void;
  setActiveSessionId: (sessionId: string) => void;
  updateSession: (
    sessionId: string,
    updater: (session: WorkbenchSession) => WorkbenchSession,
  ) => void;
  handleDeleteSession: (sessionId: string) => void;
}

export function SessionSidebar({
  sidebarWidth,
  search,
  setSearch,
  filteredSessions,
  activeSessionId,
  renameId,
  setRenameId,
  setActiveSessionId,
  updateSession,
  handleDeleteSession,
}: SessionSidebarProps) {
  const { t } = useTranslation();

  const renameSession = (sessionId: string, value: string, fallback: string) => {
    updateSession(sessionId, (item) => ({
      ...item,
      title: value.trim() || fallback,
    }));
    setRenameId(null);
  };

  return (
    <div
      className="flex h-full flex-col border-r border-[hsl(var(--border))] bg-[var(--card-surface)]/70"
      style={{ width: sidebarWidth }}
    >
      <div className="border-b border-[hsl(var(--border))] p-4">
        <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white/50 px-3 dark:bg-slate-900/35">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="border-none bg-transparent shadow-none focus-visible:ring-0"
            placeholder={t('aiWorkbench.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filteredSessions.map((session) => {
            const assistant =
              assistantCatalog.find((item) => item.id === session.assistantId) ??
              assistantCatalog[0];
            const active = session.id === activeSessionId;

            return (
              <div
                key={session.id}
                className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-transparent bg-[linear-gradient(135deg,color-mix(in_hsl,hsl(var(--primary))_20%,white),color-mix(in_hsl,hsl(var(--secondary))_16%,transparent))] shadow-md' : 'border-[hsl(var(--border))] bg-white/40 hover:bg-white/55 dark:bg-slate-900/35 dark:hover:bg-slate-900/50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    aria-current={active ? 'true' : undefined}
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setActiveSessionId(session.id)}
                    type="button"
                  >
                    {renameId === session.id ? (
                      <Input
                        autoFocus
                        className="h-8 bg-white/80 dark:bg-slate-900/50"
                        value={session.title}
                        onBlur={(event) => {
                          renameSession(session.id, event.target.value, session.title);
                        }}
                        onChange={(event) =>
                          updateSession(session.id, (item) => ({ ...item, title: event.target.value }))
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            renameSession(session.id, event.currentTarget.value, session.title);
                          }

                          if (event.key === 'Escape') {
                            setRenameId(null);
                          }
                        }}
                      />
                    ) : (
                      <div className="truncate text-sm font-semibold text-foreground">
                        {session.title}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{getAssistantName(t, assistant)}</Badge>
                      <span>{session.updatedAt}</span>
                    </div>
                  </button>
                  <Bot className="size-4 shrink-0" style={{ color: assistant.color }} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRenameId(session.id);
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                    {t('aiWorkbench.rename')}
                  </button>
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
