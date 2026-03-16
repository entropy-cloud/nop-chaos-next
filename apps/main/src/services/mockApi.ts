import type { Edge, Node } from '@xyflow/react'
import { validateMenuResponse, type MenuResponse, type PluginManifest, type User } from '@nop-chaos/shared'
import { getStorageItem, setStorageItem } from '../utils/storage'

const mockEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK === 'true'

const pluginStorageKey = 'plugins:manifests:v1'
const flowStorageKey = 'flows:documents:v1'
const orderStorageKey = 'orders:details:v1'

export type DashboardRange = 'today' | '7d' | '30d' | 'custom'

export interface DashboardMetric {
  id: string
  label: string
  value: string
  trend: string
  positive: boolean
  comparison: string
}

export interface DashboardSeriesPoint {
  label: string
  requests: number
  success: number
  errors: number
}

export interface DashboardChannelPoint {
  label: string
  apiGateway: number
  scheduler: number
  portal: number
  plugin: number
}

export interface DashboardRadarPoint {
  metric: string
  current: number
  benchmark: number
}

export interface DashboardCategoryPoint {
  name: string
  value: number
}

export interface DashboardEvent {
  id: string
  timestamp: string
  type: 'success' | 'warning' | 'error'
  description: string
  scope: string
  status: string
}

export interface DashboardData {
  metrics: DashboardMetric[]
  trend: DashboardSeriesPoint[]
  combo: DashboardSeriesPoint[]
  stacked: DashboardChannelPoint[]
  radar: DashboardRadarPoint[]
  categories: DashboardCategoryPoint[]
  events: DashboardEvent[]
}

export interface AssistantOption {
  id: 'general' | 'analysis' | 'flow'
  name: string
  color: string
  description: string
  icon: 'bot' | 'line-chart' | 'git-branch'
}

export interface WorkbenchMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface WorkbenchSession {
  id: string
  title: string
  assistantId: AssistantOption['id']
  updatedAt: string
  messages: WorkbenchMessage[]
}

export type FlowNodeKind = 'start' | 'end' | 'task' | 'condition' | 'parallel' | 'loop'

type FlowNodePayload = Record<string, unknown> & {
  label: string
  description: string
  kind: FlowNodeKind
  config: Record<string, string>
}

export interface FlowDocument {
  id: string
  name: string
  description: string
  status: 'enabled' | 'disabled' | 'draft'
  createdAt: string
  updatedAt: string
  nodes: Array<Node<FlowNodePayload>>
  edges: Array<Edge<{ condition: string; lineStyle: 'solid' | 'dashed' | 'dotted' }>>
}

function createFlowNodePayload(kind: FlowNodeKind, config: Record<string, string>, label: string, description: string): FlowNodePayload {
  return {
    label,
    description,
    kind,
    config
  }
}

export interface OrderItem {
  id: string
  product: string
  quantity: number
  price: number
}

export interface AddressRecord {
  id: string
  receiver: string
  phone: string
  province: string
  city: string
  address: string
  isDefault: boolean
}

export interface LogisticsRecord {
  id: string
  company: string
  trackingNo: string
  shippingStatus: 'pending' | 'shipping' | 'delivered'
  eta: string
  note: string
  timeline: string[]
}

export interface OrderRecord {
  id: string
  orderNo: string
  customerName: string
  status: 'active' | 'review' | 'draft' | 'closed'
  owner: string
  createdAt: string
  updatedAt: string
  amount: number
  channel: string
  items: OrderItem[]
  addresses: AddressRecord[]
  logistics: LogisticsRecord[]
}

const mockUser: User = {
  id: 'u-1001',
  username: 'admin',
  nickname: 'Nova Admin',
  email: 'admin@nop-chaos.local',
  roles: ['admin', 'editor']
}

export const seedPluginManifests: PluginManifest[] = [
  {
    id: 'plugins-demo',
    name: 'Plugin Demo',
    icon: 'Blocks',
    description: 'Runtime analytics extension rendered through SystemJS and shared shell capabilities.',
    version: '0.3.2',
    author: 'NOP Chaos Team',
    source: 'Internal registry',
    enabled: true,
    url: '/plugins/plugin-demo.system.js',
    updatedAt: '2026-03-15 09:30',
    configSchema: [
      { key: 'refreshInterval', label: 'Refresh interval', type: 'select', options: ['15s', '30s', '60s'], defaultValue: '30s' },
      { key: 'highlightThreshold', label: 'Highlight threshold', type: 'number', defaultValue: 85 },
      { key: 'reportTitle', label: 'Report title', type: 'text', defaultValue: 'Plugin operations lens' }
    ],
    settings: {
      refreshInterval: '30s',
      highlightThreshold: 85,
      reportTitle: 'Plugin operations lens'
    }
  }
]

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

const baseSeries: DashboardSeriesPoint[] = [
  { label: '03-01', requests: 1820, success: 1716, errors: 104 },
  { label: '03-02', requests: 1940, success: 1829, errors: 111 },
  { label: '03-03', requests: 2015, success: 1895, errors: 120 },
  { label: '03-04', requests: 2160, success: 2055, errors: 105 },
  { label: '03-05', requests: 2248, success: 2110, errors: 138 },
  { label: '03-06', requests: 2310, success: 2198, errors: 112 },
  { label: '03-07', requests: 2450, success: 2324, errors: 126 },
  { label: '03-08', requests: 2525, success: 2408, errors: 117 },
  { label: '03-09', requests: 2612, success: 2496, errors: 116 },
  { label: '03-10', requests: 2694, success: 2571, errors: 123 },
  { label: '03-11', requests: 2780, success: 2669, errors: 111 },
  { label: '03-12', requests: 2896, success: 2755, errors: 141 },
  { label: '03-13', requests: 2960, success: 2824, errors: 136 },
  { label: '03-14', requests: 3125, success: 2996, errors: 129 },
  { label: '03-15', requests: 3260, success: 3131, errors: 129 },
  { label: '03-16', requests: 3345, success: 3218, errors: 127 },
  { label: '03-17', requests: 3412, success: 3279, errors: 133 },
  { label: '03-18', requests: 3560, success: 3428, errors: 132 },
  { label: '03-19', requests: 3618, success: 3492, errors: 126 },
  { label: '03-20', requests: 3755, success: 3615, errors: 140 },
  { label: '03-21', requests: 3880, success: 3731, errors: 149 },
  { label: '03-22', requests: 3924, success: 3798, errors: 126 },
  { label: '03-23', requests: 4010, success: 3894, errors: 116 },
  { label: '03-24', requests: 4180, success: 4064, errors: 116 },
  { label: '03-25', requests: 4255, success: 4110, errors: 145 },
  { label: '03-26', requests: 4340, success: 4202, errors: 138 },
  { label: '03-27', requests: 4465, success: 4320, errors: 145 },
  { label: '03-28', requests: 4524, success: 4392, errors: 132 },
  { label: '03-29', requests: 4688, success: 4549, errors: 139 },
  { label: '03-30', requests: 4790, success: 4644, errors: 146 }
]

const baseChannels: DashboardChannelPoint[] = baseSeries.map((item, index) => ({
  label: item.label,
  apiGateway: Math.round(item.requests * (0.42 + (index % 3) * 0.01)),
  scheduler: Math.round(item.requests * (0.21 + (index % 4) * 0.008)),
  portal: Math.round(item.requests * (0.24 + (index % 2) * 0.01)),
  plugin: Math.round(item.requests * (0.11 + (index % 5) * 0.006))
}))

const baseEvents: DashboardEvent[] = [
  { id: 'evt-1', timestamp: '2026-03-30 10:22', type: 'error', description: '模型网关出现间歇性超时，自动切换至备用池。', scope: 'AI 推理集群', status: '处理中' },
  { id: 'evt-2', timestamp: '2026-03-30 09:48', type: 'warning', description: '插件 Demo 上报频率提升，接近预警阈值。', scope: '插件容器 / 报表模块', status: '观察中' },
  { id: 'evt-3', timestamp: '2026-03-30 09:30', type: 'success', description: '订单工作流 v2.1 已发布并同步至生产影子环境。', scope: 'Flow Editor', status: '已完成' },
  { id: 'evt-4', timestamp: '2026-03-29 18:05', type: 'success', description: '主子表批量导出任务完成，共生成 124 个文件。', scope: '数据管理', status: '已完成' },
  { id: 'evt-5', timestamp: '2026-03-29 16:12', type: 'warning', description: '华东区物流接口出现 3 次重试。', scope: '物流服务', status: '已恢复' },
  { id: 'evt-6', timestamp: '2026-03-29 14:36', type: 'error', description: '地址表单校验规则与后端版本不一致。', scope: '订单详情 / 地址子表', status: '待确认' }
]

const seedFlows: FlowDocument[] = [
  {
    id: 'flow-101',
    name: 'Customer onboarding',
    description: '从注册到首单完成的自动化流程。',
    status: 'enabled',
    createdAt: '2026-03-01 08:10',
    updatedAt: '2026-03-30 09:10',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 80, y: 180 }, data: createFlowNodePayload('start', { trigger: '注册成功' }, '开始', '流程入口') },
      { id: 'task-1', type: 'task', position: { x: 300, y: 180 }, data: createFlowNodePayload('task', { channel: 'email', timeout: '30s' }, '发送欢迎邮件', '邮件通知') },
      { id: 'condition-1', type: 'condition', position: { x: 540, y: 180 }, data: createFlowNodePayload('condition', { expression: 'customerType === enterprise' }, '是否企业客户', '分配专属路径') },
      { id: 'parallel-1', type: 'parallel', position: { x: 790, y: 90 }, data: createFlowNodePayload('parallel', { branches: '2' }, '并行任务', '创建销售任务 + 初始化资料') },
      { id: 'loop-1', type: 'loop', position: { x: 790, y: 280 }, data: createFlowNodePayload('loop', { limit: '5', interval: '1d' }, '补全资料轮询', '直到资料完整') },
      { id: 'end-1', type: 'end', position: { x: 1030, y: 180 }, data: createFlowNodePayload('end', { result: 'completed' }, '结束', '流程出口') }
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'task-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '触发后', lineStyle: 'solid' }, label: '触发' },
      { id: 'e-2', source: 'task-1', target: 'condition-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '发送成功', lineStyle: 'solid' }, label: '成功' },
      { id: 'e-3', source: 'condition-1', target: 'parallel-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '是', lineStyle: 'dashed' }, label: '企业客户' },
      { id: 'e-4', source: 'condition-1', target: 'loop-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '否', lineStyle: 'dotted' }, label: '普通客户' },
      { id: 'e-5', source: 'parallel-1', target: 'end-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '完成', lineStyle: 'solid' }, label: '完成' },
      { id: 'e-6', source: 'loop-1', target: 'end-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '资料完整', lineStyle: 'solid' }, label: '完成' }
    ]
  },
  {
    id: 'flow-102',
    name: 'Knowledge sync',
    description: '夜间同步知识库与摘要索引。',
    status: 'draft',
    createdAt: '2026-03-06 11:20',
    updatedAt: '2026-03-28 21:40',
    nodes: [],
    edges: []
  },
  {
    id: 'flow-103',
    name: 'Plugin deployment',
    description: '插件灰度发布与健康检查。',
    status: 'disabled',
    createdAt: '2026-03-08 14:05',
    updatedAt: '2026-03-27 17:20',
    nodes: [],
    edges: []
  },
  {
    id: 'flow-104',
    name: 'Invoice review',
    description: '发票审批与异常处理。',
    status: 'enabled',
    createdAt: '2026-03-10 09:00',
    updatedAt: '2026-03-29 12:48',
    nodes: [],
    edges: []
  },
  {
    id: 'flow-105',
    name: 'Logistics recovery',
    description: '物流异常单恢复策略。',
    status: 'draft',
    createdAt: '2026-03-12 16:40',
    updatedAt: '2026-03-26 09:11',
    nodes: [],
    edges: []
  }
]

const seedOrders: OrderRecord[] = [
  {
    id: '1001',
    orderNo: 'SO-202603-1001',
    customerName: 'Acme Intelligence',
    status: 'active',
    owner: 'Nadia',
    createdAt: '2026-03-25 09:20',
    updatedAt: '2026-03-30 10:05',
    amount: 28480,
    channel: '企业直签',
    items: [
      { id: 'item-1', product: 'AI Copilot Pro', quantity: 12, price: 1580 },
      { id: 'item-2', product: 'Workflow Builder', quantity: 8, price: 980 },
      { id: 'item-3', product: 'Monitoring Add-on', quantity: 4, price: 435 }
    ],
    addresses: [
      { id: 'addr-1', receiver: 'Liam Chen', phone: '13800138000', province: '上海', city: '上海市', address: '浦东新区张江路 88 号 18F', isDefault: true },
      { id: 'addr-2', receiver: 'Ivy Wu', phone: '13900139000', province: '江苏', city: '苏州市', address: '工业园区星湖街 210 号', isDefault: false }
    ],
    logistics: [
      { id: 'log-1', company: 'SF Express', trackingNo: 'SF123456789CN', shippingStatus: 'shipping', eta: '2026-04-01', note: '优先派送至前台', timeline: ['03-29 18:00 已揽收', '03-30 02:20 到达上海转运中心', '03-30 08:15 派送中'] }
    ]
  },
  {
    id: '1002',
    orderNo: 'SO-202603-1002',
    customerName: 'Northwind Hub',
    status: 'review',
    owner: 'Hector',
    createdAt: '2026-03-24 13:40',
    updatedAt: '2026-03-29 18:50',
    amount: 19860,
    channel: '渠道伙伴',
    items: [
      { id: 'item-4', product: 'Analytics Console', quantity: 6, price: 1260 },
      { id: 'item-5', product: 'Integration Pack', quantity: 3, price: 1780 }
    ],
    addresses: [
      { id: 'addr-3', receiver: 'Mia Sun', phone: '13700137000', province: '浙江', city: '杭州市', address: '西湖区古墩路 66 号', isDefault: true }
    ],
    logistics: [
      { id: 'log-2', company: 'JD Logistics', trackingNo: 'JD99887766', shippingStatus: 'pending', eta: '2026-04-02', note: '待仓库复核', timeline: ['03-29 18:50 已创建物流单'] }
    ]
  },
  {
    id: '1003',
    orderNo: 'SO-202603-1003',
    customerName: 'Skylab Runtime',
    status: 'draft',
    owner: 'Priya',
    createdAt: '2026-03-22 16:15',
    updatedAt: '2026-03-28 14:20',
    amount: 8860,
    channel: '官网自助',
    items: [{ id: 'item-6', product: 'Starter Plan', quantity: 2, price: 4430 }],
    addresses: [{ id: 'addr-4', receiver: 'Luna Gao', phone: '13600136000', province: '北京', city: '北京市', address: '朝阳区酒仙桥北路 9 号', isDefault: true }],
    logistics: []
  },
  {
    id: '1004',
    orderNo: 'SO-202603-1004',
    customerName: 'Aster Labs',
    status: 'closed',
    owner: 'Noah',
    createdAt: '2026-03-18 11:00',
    updatedAt: '2026-03-27 10:12',
    amount: 12450,
    channel: '线索转化',
    items: [{ id: 'item-7', product: 'Agent Studio', quantity: 5, price: 2490 }],
    addresses: [{ id: 'addr-5', receiver: 'Eric Tan', phone: '13500135000', province: '广东', city: '深圳市', address: '南山区科苑路 15 号', isDefault: true }],
    logistics: [{ id: 'log-3', company: 'YTO', trackingNo: 'YT99881122', shippingStatus: 'delivered', eta: '2026-03-22', note: '客户已签收', timeline: ['03-20 10:00 已发货', '03-21 09:10 运输中', '03-22 16:30 已签收'] }]
  }
]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function wait<T>(value: T, ms = 240): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), mockEnabled ? ms : 0)
  })
}

function readStoredJson<T>(key: string, fallback: T): T {
  const raw = getStorageItem(key)
  if (!raw) {
    return clone(fallback)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return clone(fallback)
  }
}

function writeStoredJson<T>(key: string, value: T): void {
  setStorageItem(key, JSON.stringify(value))
}

function getFlowDocuments() {
  return readStoredJson(flowStorageKey, seedFlows)
}

function saveFlowDocuments(flows: FlowDocument[]) {
  writeStoredJson(flowStorageKey, flows)
}

function getOrderDocuments() {
  return readStoredJson(orderStorageKey, seedOrders)
}

function saveOrderDocuments(orders: OrderRecord[]) {
  writeStoredJson(orderStorageKey, orders)
}

export function getPluginSeeds(): PluginManifest[] {
  return readStoredJson(pluginStorageKey, seedPluginManifests)
}

export function persistPluginSeeds(value: PluginManifest[]) {
  writeStoredJson(pluginStorageKey, value)
}

function getRangeSize(range: DashboardRange, start?: string, end?: string) {
  if (range === 'today') {
    return 1
  }

  if (range === '7d') {
    return 7
  }

  if (range === '30d') {
    return 30
  }

  if (!start || !end) {
    return 7
  }

  const startDate = new Date(start)
  const endDate = new Date(end)
  const diff = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1)
  return Math.min(30, diff)
}

function formatCompact(value: number) {
  if (value >= 10_000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return `${value}`
}

export async function loginRequest(username: string, password: string): Promise<{ user: User; token: string }> {
  if (username === 'admin' && password === '123456') {
    return wait({ user: mockUser, token: 'mock-token-admin' }, 300)
  }

  throw new Error('Invalid username or password')
}

export async function fetchMenuConfig(): Promise<MenuResponse> {
  const response = await fetch('/data/menu-config.json', {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to load menu config: ${response.status}`)
  }

  return wait(validateMenuResponse(await response.json()), 260)
}

export async function fetchPluginList(): Promise<PluginManifest[]> {
  return wait(getPluginSeeds(), 220)
}

export async function fetchDashboardData(range: DashboardRange, customStart?: string, customEnd?: string): Promise<DashboardData> {
  const size = getRangeSize(range, customStart, customEnd)
  const trend = baseSeries.slice(-size)
  const combo = baseSeries.slice(-Math.max(7, size))
  const stacked = baseChannels.slice(-Math.max(7, size))
  const totalRequests = trend.reduce((sum, item) => sum + item.requests, 0)
  const totalSuccess = trend.reduce((sum, item) => sum + item.success, 0)
  const totalErrors = trend.reduce((sum, item) => sum + item.errors, 0)
  const previous = baseSeries.slice(-(size * 2), -size)
  const previousRequests = previous.reduce((sum, item) => sum + item.requests, 0) || totalRequests
  const successRate = totalRequests === 0 ? 0 : (totalSuccess / totalRequests) * 100
  const previousRate = previousRequests === 0 ? successRate : (previous.reduce((sum, item) => sum + item.success, 0) / previousRequests) * 100
  const avgLatency = 142 + (30 - size) * 1.4
  const previousLatency = avgLatency + 9.6
  const activeSessions = 420 + size * 18
  const previousSessions = activeSessions - 62
  const metrics: DashboardMetric[] = [
    {
      id: 'requests',
      label: '今日总请求数',
      value: formatCompact(totalRequests),
      trend: `${(((totalRequests - previousRequests) / previousRequests) * 100).toFixed(1)}%`,
      positive: totalRequests >= previousRequests,
      comparison: '较上一周期请求规模'
    },
    {
      id: 'success-rate',
      label: '最近 24 小时成功率',
      value: `${successRate.toFixed(1)}%`,
      trend: `${(successRate - previousRate).toFixed(1)}%`,
      positive: successRate >= previousRate,
      comparison: '较上一周期成功率'
    },
    {
      id: 'latency',
      label: '平均响应时间',
      value: `${avgLatency.toFixed(0)}ms`,
      trend: `${Math.abs(avgLatency - previousLatency).toFixed(0)}ms`,
      positive: avgLatency <= previousLatency,
      comparison: '较上一周期延迟'
    },
    {
      id: 'sessions',
      label: '活跃会话数',
      value: formatCompact(activeSessions),
      trend: `${(((activeSessions - previousSessions) / previousSessions) * 100).toFixed(1)}%`,
      positive: activeSessions >= previousSessions,
      comparison: '较上一周期活跃度'
    }
  ]

  return wait(
    {
      metrics,
      trend,
      combo,
      stacked,
      radar: [
        { metric: '稳定性', current: 86, benchmark: 74 },
        { metric: '吞吐能力', current: 91, benchmark: 80 },
        { metric: '自动化覆盖', current: 78, benchmark: 66 },
        { metric: '插件活跃', current: 72, benchmark: 60 },
        { metric: '数据质量', current: 88, benchmark: 76 },
        { metric: '恢复速度', current: 83, benchmark: 69 }
      ],
      categories: [
        { name: '接口超时', value: totalErrors * 0.34 },
        { name: '参数校验', value: totalErrors * 0.22 },
        { name: '权限拒绝', value: totalErrors * 0.18 },
        { name: '依赖异常', value: totalErrors * 0.16 },
        { name: '其他', value: totalErrors * 0.1 }
      ].map((item) => ({ ...item, value: Math.round(item.value) })),
      events: baseEvents.slice(0, Math.max(4, Math.min(baseEvents.length, size + 2)))
    },
    260
  )
}

export function createMockAiReply(prompt: string, assistantId: AssistantOption['id'], includeContext: boolean, contextSummary: string) {
  const prefix =
    assistantId === 'analysis'
      ? '以下是基于数据视角的建议：'
      : assistantId === 'flow'
        ? '以下是流程编排层面的建议：'
        : '以下是整理后的答复：'

  return `${prefix}\n\n- 目标问题：${prompt || '未提供明确问题'}\n- 建议拆分为 3 个执行步骤\n- 优先处理高风险与高反馈密度模块\n${includeContext ? `- 已附带上下文：${contextSummary}\n` : ''}\n**下一步**\n1. 明确验收标准\n2. 补齐关键交互与异常状态\n3. 输出可直接评审的原型说明`
}

export async function fetchFlowList(): Promise<FlowDocument[]> {
  return wait(getFlowDocuments(), 220)
}

export async function fetchFlowDetail(id: string): Promise<FlowDocument> {
  if (id === 'new') {
    return wait(
      {
        id: `flow-${Date.now()}`,
        name: 'Untitled flow',
        description: '新建流程草稿',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 120, y: 180 }, data: createFlowNodePayload('start', { trigger: 'manual' }, '开始', '流程入口') },
          { id: 'end-1', type: 'end', position: { x: 480, y: 180 }, data: createFlowNodePayload('end', { result: 'done' }, '结束', '流程出口') }
        ],
        edges: [
          { id: 'e-start-end', source: 'start-1', target: 'end-1', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, data: { condition: '完成', lineStyle: 'solid' }, label: '完成' }
        ]
      },
      120
    )
  }

  const flow = getFlowDocuments().find((item) => item.id === id)
  if (!flow) {
    throw new Error('Flow not found')
  }

  return wait(flow, 180)
}

export async function saveFlowDetail(document: FlowDocument): Promise<FlowDocument> {
  const flows = getFlowDocuments()
  const next = flows.some((item) => item.id === document.id)
    ? flows.map((item) => (item.id === document.id ? { ...document, updatedAt: new Date().toISOString() } : item))
    : [...flows, { ...document, updatedAt: new Date().toISOString() }]

  saveFlowDocuments(next)
  return wait(clone(next.find((item) => item.id === document.id) ?? document), 180)
}

export async function deleteFlow(flowId: string): Promise<void> {
  saveFlowDocuments(getFlowDocuments().filter((item) => item.id !== flowId))
  return wait(undefined, 120)
}

export async function fetchOrderList(): Promise<OrderRecord[]> {
  return wait(getOrderDocuments(), 220)
}

export async function fetchOrderDetail(orderId: string): Promise<OrderRecord> {
  const order = getOrderDocuments().find((item) => item.id === orderId)
  if (!order) {
    throw new Error('Order not found')
  }

  return wait(order, 180)
}

export async function saveOrderDetail(order: OrderRecord): Promise<OrderRecord> {
  const nextOrders = getOrderDocuments().map((item) => (item.id === order.id ? { ...order, updatedAt: new Date().toISOString() } : item))
  saveOrderDocuments(nextOrders)
  return wait(clone(nextOrders.find((item) => item.id === order.id) ?? order), 180)
}

export async function deleteOrders(orderIds: string[]): Promise<void> {
  saveOrderDocuments(getOrderDocuments().filter((item) => !orderIds.includes(item.id)))
  return wait(undefined, 160)
}

export async function logoutRequest(): Promise<void> {
  return wait(undefined, 180)
}
