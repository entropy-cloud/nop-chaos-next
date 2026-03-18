import { assistantCatalog, type AssistantOption, type WorkbenchMessage, type WorkbenchSession } from '../../services/mockApi'

export type Translate = (key: string, options?: Record<string, unknown>) => string

export function getAssistantName(t: Translate, option: AssistantOption) {
  return t(`aiWorkbench.assistants.${option.id}.name`, { defaultValue: option.name })
}

export function getAssistantDescription(t: Translate, option: AssistantOption) {
  return t(`aiWorkbench.assistants.${option.id}.description`, { defaultValue: option.description })
}

export function formatAssistantLabel(t: Translate, option: AssistantOption) {
  return `${getAssistantName(t, option)} · ${getAssistantDescription(t, option)}`
}

export function buildHistoricalMessages(t: Translate, session: WorkbenchSession): WorkbenchMessage[] {
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
