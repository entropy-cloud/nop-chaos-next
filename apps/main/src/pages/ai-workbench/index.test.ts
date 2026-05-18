// @vitest-environment happy-dom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiWorkbenchTestUtils } from './markdown';

const h = React.createElement;

const { toastInfoMock } = vi.hoisted(() => ({
  toastInfoMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? key),
  }),
}));

vi.mock('@nop-chaos/ui', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    h('button', { type: 'button', onClick, ...props }, children),
  Select: ({ children }: { children: React.ReactNode }) => h('div', null, children),
  SelectContent: ({ children }: { children: React.ReactNode }) => h('div', null, children),
  SelectItem: ({ children }: { children: React.ReactNode }) => h('div', null, children),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => h('div', null, children),
  SelectValue: () => h('span'),
  toast: {
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

vi.mock('../../components/common/PageHeader', () => ({
  PageHeader: ({ actions }: { actions?: React.ReactNode }) => h('div', null, actions),
}));

vi.mock('../../services/mockApi', () => ({
  assistantCatalog: [
    {
      id: 'general',
      name: 'General',
      color: 'blue',
      description: 'General assistant',
      icon: 'bot',
    },
    {
      id: 'analysis',
      name: 'Analysis',
      color: 'green',
      description: 'Analysis assistant',
      icon: 'chart-line',
    },
  ],
  createMockAiReply: () => 'ABCDE',
  seedWorkbenchSessions: [
    {
      id: 'session-1',
      title: 'Session One',
      assistantId: 'general',
      updatedAt: '10:00',
      messages: [
        {
          id: 'message-1',
          role: 'assistant',
          content: 'Seed reply one',
          createdAt: '10:00',
        },
      ],
    },
    {
      id: 'session-2',
      title: 'Session Two',
      assistantId: 'analysis',
      updatedAt: '11:00',
      messages: [
        {
          id: 'message-2',
          role: 'assistant',
          content: 'Seed reply two',
          createdAt: '11:00',
        },
      ],
    },
  ],
}));

vi.mock('./components/ContextPanel', () => ({
  ContextPanel: () => null,
}));

vi.mock('./components/SessionSidebar', () => ({
  SessionSidebar: ({ filteredSessions, setActiveSessionId }: { filteredSessions: Array<{ id: string; title: string; messages: Array<{ content: string }> }>; setActiveSessionId: (sessionId: string) => void }) =>
    h(
      'div',
      null,
      filteredSessions.map((session) =>
        h(
          'div',
          { key: session.id, 'data-testid': `session-row-${session.id}` },
          h(
            'button',
            {
              type: 'button',
              'data-testid': `session-select-${session.id}`,
              onClick: () => setActiveSessionId(session.id),
            },
            session.title,
          ),
          h('span', { 'data-testid': `session-last-${session.id}` }, session.messages.at(-1)?.content ?? ''),
        ),
      ),
    ),
}));

vi.mock('./components/ConversationPanel', () => ({
  ConversationPanel: ({
    activeSession,
    draft,
    setDraft,
    handleSend,
    handleStop,
    loadOlderMessages,
    streaming,
  }: {
    activeSession?: { id: string; messages: Array<{ role: string; content: string }> };
    draft: string;
    setDraft: (value: string) => void;
    handleSend: () => Promise<void>;
    handleStop: () => void;
    loadOlderMessages: (sessionId: string) => void;
    streaming: boolean;
  }) =>
    h(
      'div',
      null,
      h('div', { 'data-testid': 'active-session-id' }, activeSession?.id ?? 'none'),
      h(
        'div',
        { 'data-testid': 'active-session-messages' },
        (activeSession?.messages ?? []).map((message) => `${message.role}:${message.content}`).join('|'),
      ),
      h('div', { 'data-testid': 'streaming-state' }, String(streaming)),
      h('textarea', {
        'data-testid': 'draft-input',
        value: draft,
        onChange: (event: Event) => setDraft((event.currentTarget as HTMLTextAreaElement).value),
      }),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'load-older',
          onClick: () => activeSession && loadOlderMessages(activeSession.id),
        },
        'load older',
      ),
      h(
        'button',
        { type: 'button', 'data-testid': 'send-message', onClick: () => void handleSend() },
        'send',
      ),
      h('button', { type: 'button', 'data-testid': 'stop-stream', onClick: handleStop }, 'stop'),
    ),
}));

describe('aiWorkbenchTestUtils.parseMarkdownBlocks', () => {
  it('parses unordered lists, ordered lists, and code blocks', () => {
    const { parseMarkdownBlocks } = aiWorkbenchTestUtils();
    const blocks = parseMarkdownBlocks(
      '以下是建议：\n\n- 第一项\n- 第二项\n\n1. 步骤一\n2. 步骤二\n\n```txt\nhello\nworld\n```',
    );

    expect(blocks).toEqual([
      { type: 'paragraph', text: '以下是建议：' },
      { type: 'list', ordered: false, items: ['第一项', '第二项'] },
      { type: 'list', ordered: true, items: ['步骤一', '步骤二'] },
      { type: 'code', code: 'hello\nworld' },
    ]);
  });
});

describe('AIWorkbenchPage lifecycle', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let AIWorkbenchPage: typeof import('./index').default;

  beforeEach(async () => {
    vi.useFakeTimers();
    toastInfoMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    AIWorkbenchPage = (await import('./index')).default;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('stops streaming when the active session changes', async () => {
    await act(async () => {
      root.render(h(AIWorkbenchPage));
    });

    const draftInput = container.querySelector('[data-testid="draft-input"]') as HTMLTextAreaElement;
    const sendButton = container.querySelector('[data-testid="send-message"]') as HTMLButtonElement;

    await act(async () => {
      draftInput.value = 'Need a plan';
      draftInput.dispatchEvent(new Event('input', { bubbles: true }));
      sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(24);
    });

    const streamedBeforeSwitch = container.querySelector('[data-testid="session-last-session-1"]')?.textContent;

    await act(async () => {
      container
        .querySelector('[data-testid="session-select-session-2"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="active-session-id"]')?.textContent).toBe('session-2');
    expect(container.querySelector('[data-testid="streaming-state"]')?.textContent).toBe('false');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(container.querySelector('[data-testid="session-last-session-1"]')?.textContent).toBe(
      streamedBeforeSwitch,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops streaming immediately when stop is requested', async () => {
    await act(async () => {
      root.render(h(AIWorkbenchPage));
    });

    const draftInput = container.querySelector('[data-testid="draft-input"]') as HTMLTextAreaElement;

    await act(async () => {
      draftInput.value = 'Stop midway';
      draftInput.dispatchEvent(new Event('input', { bubbles: true }));
      container
        .querySelector('[data-testid="send-message"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12);
    });

    const streamedBeforeStop = container.querySelector('[data-testid="session-last-session-1"]')?.textContent;

    await act(async () => {
      container
        .querySelector('[data-testid="stop-stream"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="streaming-state"]')?.textContent).toBe('false');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(container.querySelector('[data-testid="session-last-session-1"]')?.textContent).toBe(
      streamedBeforeStop,
    );
    expect(toastInfoMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears pending history and stream timers on unmount', async () => {
    await act(async () => {
      root.render(h(AIWorkbenchPage));
    });

    const draftInput = container.querySelector('[data-testid="draft-input"]') as HTMLTextAreaElement;

    await act(async () => {
      container
        .querySelector('[data-testid="load-older"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      draftInput.value = 'Unmount while streaming';
      draftInput.dispatchEvent(new Event('input', { bubbles: true }));
      container
        .querySelector('[data-testid="send-message"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});
