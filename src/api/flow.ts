import { api } from "./client"
import type { FlowNode, FlowEdge, ApiResponse } from "@/types"

interface FlowData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export const flowApi = {
  get: (id: string) => api.get<ApiResponse<FlowData>>(`/flows/${id}`),
  save: (id: string, data: FlowData) =>
    api.post<ApiResponse<FlowData>>(`/flows/${id}`, data),
  getTemplates: () => api.get<ApiResponse<FlowData[]>>("/flows/templates"),
}
