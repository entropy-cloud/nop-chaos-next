import type { AssistantOption, WorkbenchSession } from './types'

export const assistantCatalog: AssistantOption[] = [
  {
    id: 'general',
    name: '通用助手',
    color: 'hsl(var(--primary))',
    description: '处理常见问答、写作与方案整理。',
    icon: 'bot'
  },
  {
    id: 'analysis',
    name: '数据分析助手',
    color: 'hsl(var(--success))',
    description: '擅长分析指标、图表和报表结论。',
    icon: 'line-chart'
  },
  {
    id: 'flow',
    name: '流程设计助手',
    color: 'hsl(var(--warning))',
    description: '帮助设计节点逻辑、分支条件与编排步骤。',
    icon: 'git-branch'
  }
]

export const seedWorkbenchSessions: WorkbenchSession[] = [
  {
    id: 'session-1001',
    title: '仪表盘改版提案',
    assistantId: 'general',
    updatedAt: '10:28',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: '请帮我整理一个新的 dashboard 信息架构。',
        createdAt: '10:18'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '可以从以下 3 层结构开始：\n\n- **核心指标层**：请求量、成功率、平均响应时间、活跃会话\n- **趋势分析层**：7 日请求趋势、错误分布、渠道贡献\n- **行动反馈层**：最近事件、插件洞察、待处理告警',
        createdAt: '10:18'
      }
    ]
  },
  {
    id: 'session-1002',
    title: '订单明细校验规则',
    assistantId: 'analysis',
    updatedAt: '昨天 18:20',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: '帮我列出订单子表的必填校验项。',
        createdAt: '昨天 18:13'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: '建议至少校验：\n\n```txt\n商品名称不能为空\n数量必须为正整数\n单价必须大于 0\n默认地址必须且仅能有一个\n物流单号在发货状态时必填\n```',
        createdAt: '昨天 18:14'
      }
    ]
  },
  {
    id: 'session-1003',
    title: '并行节点重试策略',
    assistantId: 'flow',
    updatedAt: '昨天 09:52',
    messages: [
      {
        id: 'msg-5',
        role: 'assistant',
        content: '可以把并行节点拆成「任务组 + 汇聚检查」两层，避免单一节点承载过多状态。',
        createdAt: '昨天 09:40'
      }
    ]
  }
]

export function createMockAiReply(
  prompt: string,
  assistantId: AssistantOption['id'],
  includeContext: boolean,
  contextSummary: string
) {
  const prefix =
    assistantId === 'analysis'
      ? '以下是基于数据视角的建议：'
      : assistantId === 'flow'
        ? '以下是流程编排层面的建议：'
        : '以下是整理后的答复：'

  return `${prefix}\n\n- 目标问题：${prompt || '未提供明确问题'}\n- 建议拆分为 3 个执行步骤\n- 优先处理高风险与高反馈密度模块\n${includeContext ? `- 已附带上下文：${contextSummary}\n` : ''}\n**下一步**\n1. 明确验收标准\n2. 补齐关键交互与异常状态\n3. 输出可直接评审的原型说明`
}
