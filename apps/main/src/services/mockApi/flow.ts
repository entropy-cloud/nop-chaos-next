import type { FlowDocument, FlowNodeKind, FlowNodePayload } from './types'
import { clone, readStoredJson, wait, writeStoredJson } from './shared'

const flowStorageKey = 'flows:documents:v1'

function createFlowNodePayload(kind: FlowNodeKind, config: Record<string, string>, label: string, description: string): FlowNodePayload {
  return {
    label,
    description,
    kind,
    config
  }
}

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

function getFlowDocuments() {
  return readStoredJson(flowStorageKey, seedFlows)
}

function saveFlowDocuments(flows: FlowDocument[]) {
  writeStoredJson(flowStorageKey, flows)
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
