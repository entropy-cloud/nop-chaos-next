import type { OrderRecord } from './types'
import { clone, readStoredJson, wait, writeStoredJson } from './shared'

const orderStorageKey = 'orders:details:v1'

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

function getOrderDocuments() {
  return readStoredJson(orderStorageKey, seedOrders)
}

function saveOrderDocuments(orders: OrderRecord[]) {
  writeStoredJson(orderStorageKey, orders)
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
