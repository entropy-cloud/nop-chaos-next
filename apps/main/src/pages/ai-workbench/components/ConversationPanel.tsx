import { Copy, Sparkles, Square, Trash2, Wand2 } from 'lucide-react';
import { Button, Textarea } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type {
  AssistantOption,
  WorkbenchMessage,
  WorkbenchSession,
} from '../../../services/mockApi';
import { renderMarkdownBlocks } from '../markdown';
import { formatAssistantLabel } from '../utils';

interface ConversationPanelProps {
  activeSession: WorkbenchSession | undefined;
  currentAssistant: AssistantOption;
  historyLoadedIds: string[];
  historyLoadingId: string | null;
  loadOlderMessages: (sessionId: string) => void;
  updateSession: (
    sessionId: string,
    updater: (session: WorkbenchSession) => WorkbenchSession,
  ) => void;
  handleRegenerate: () => void;
  handleCopy: (message: WorkbenchMessage) => Promise<void>;
  draft: string;
  setDraft: (value: string) => void;
  handleSend: () => Promise<void>;
  handleStop: () => void;
  streaming: boolean;
  setScrollContainer: (node: HTMLDivElement | null) => void;
}

export function ConversationPanel({
  activeSession,
  currentAssistant,
  historyLoadedIds,
  historyLoadingId,
  loadOlderMessages,
  updateSession,
  handleRegenerate,
  handleCopy,
  draft,
  setDraft,
  handleSend,
  handleStop,
  streaming,
  setScrollContainer,
}: ConversationPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col border-r border-[hsl(var(--border))]">
      <div className="border-b border-[hsl(var(--border))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-white/45 p-4 backdrop-blur-xl dark:bg-slate-900/35">
          <div>
            <div className="text-sm font-semibold text-foreground">{activeSession?.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatAssistantLabel(t, currentAssistant)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRegenerate}>
              <Wand2 className="size-4" />
              {t('aiWorkbench.regenerate')}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                activeSession &&
                updateSession(activeSession.id, (session) => ({ ...session, messages: [] }))
              }
            >
              <Trash2 className="size-4" />
              {t('aiWorkbench.clearConversation')}
            </Button>
          </div>
        </div>
      </div>

      <div ref={setScrollContainer} className="flex-1 overflow-y-auto p-5">
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
              {historyLoadingId === activeSession.id
                ? t('common.loading')
                : t('aiWorkbench.loadOlder')}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {(activeSession?.messages ?? []).map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'ml-auto max-w-[82%]' : 'max-w-[86%]'}
            >
              <div
                className={
                  message.role === 'user'
                    ? 'rounded-xl rounded-br-md bg-[linear-gradient(135deg,hsl(var(--primary)),color-mix(in_hsl,hsl(var(--secondary))_70%,white))] px-5 py-4 text-sm text-white shadow-primary-md'
                    : 'rounded-xl rounded-bl-md border border-[hsl(var(--border))] bg-white/55 px-5 py-4 text-sm text-muted-foreground backdrop-blur-xl dark:bg-slate-900/40'
                }
              >
                <div className="space-y-2">{renderMarkdownBlocks(message.content)}</div>
                <div
                  className={`mt-3 flex items-center justify-between text-sm ${message.role === 'user' ? 'text-white/80' : 'text-muted-foreground'}`}
                >
                  <span>{message.createdAt}</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => void handleCopy(message)}
                      type="button"
                    >
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
                event.preventDefault();
                void handleSend();
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
  );
}
