import { api } from "./client"
import type { User, ApiResponse } from "@/types"

export const userApi = {
  getList: () => api.get<ApiResponse<User[]>>("/users"),
  getById: (id: number) => api.get<ApiResponse<User>>(`/users/${id}`),
  create: (user: Omit<User, "id" | "createdAt">) => api.post<ApiResponse<User>>("/users", user),
  update: (id: number, user: Partial<User>) => api.put<ApiResponse<User>>(`/users/${id}`, user),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/users/${id}`),
}
