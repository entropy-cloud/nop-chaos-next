import { api } from "./client"
import type { Order, OrderItem, ApiResponse, PaginatedResponse } from "@/types"

export const orderApi = {
  getList: (page = 1, pageSize = 10) =>
    api.get<PaginatedResponse<Order>>("/orders", { page, pageSize }),
  getById: (id: number) => api.get<ApiResponse<Order>>(`/orders/${id}`),
  create: (order: Omit<Order, "id" | "createdAt">) =>
    api.post<ApiResponse<Order>>("/orders", order),
  update: (id: number, order: Partial<Order>) =>
    api.put<ApiResponse<Order>>(`/orders/${id}`, order),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/orders/${id}`),
  getItems: (orderId: number) =>
    api.get<ApiResponse<OrderItem[]>>(`/orders/${orderId}/items`),
  addItem: (orderId: number, item: Omit<OrderItem, "id" | "orderId">) =>
    api.post<ApiResponse<OrderItem>>(`/orders/${orderId}/items`, item),
  updateItem: (orderId: number, itemId: number, item: Partial<OrderItem>) =>
    api.put<ApiResponse<OrderItem>>(`/orders/${orderId}/items/${itemId}`, item),
  deleteItem: (orderId: number, itemId: number) =>
    api.delete<ApiResponse<void>>(`/orders/${orderId}/items/${itemId}`),
}
