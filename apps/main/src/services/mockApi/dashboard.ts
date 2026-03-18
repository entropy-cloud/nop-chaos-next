import type { DashboardChannelPoint, DashboardData, DashboardEvent, DashboardMetric, DashboardRange, DashboardSeriesPoint } from './types'
import { wait } from './shared'

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
