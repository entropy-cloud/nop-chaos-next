import type { Edge, Node } from '@xyflow/react'

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

export type FlowEdgeData = {
  condition: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
}

export type FlowNodePayload = Record<string, unknown> & {
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
  edges: Array<Edge<FlowEdgeData>>
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
