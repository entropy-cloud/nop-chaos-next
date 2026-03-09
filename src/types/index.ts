export interface User {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
  createdAt: string
}

export interface Order {
  id: number
  orderNo: string
  customer: string
  amount: number
  status: "pending" | "processing" | "completed" | "cancelled"
  createdAt: string
}

export interface OrderItem {
  id: number
  orderId: number
  productName: string
  quantity: number
  price: number
}

export interface ChartData {
  name: string
  value: number
  date?: string
}

export interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
