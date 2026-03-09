import { api } from "./client"
import type { ChartData, ApiResponse } from "@/types"

export const chartApi = {
  getLineData: () => api.get<ApiResponse<ChartData[]>>("/charts/line"),
  getBarData: () => api.get<ApiResponse<ChartData[]>>("/charts/bar"),
  getPieData: () => api.get<ApiResponse<ChartData[]>>("/charts/pie"),
  getAreaData: () => api.get<ApiResponse<ChartData[]>>("/charts/area"),
}
