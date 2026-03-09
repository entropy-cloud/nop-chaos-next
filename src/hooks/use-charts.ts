import { useQuery } from "@tanstack/react-query"
import { chartApi } from "@/api"

export function useLineChartData() {
  return useQuery({
    queryKey: ["charts", "line"],
    queryFn: () => chartApi.getLineData(),
  })
}

export function useBarChartData() {
  return useQuery({
    queryKey: ["charts", "bar"],
    queryFn: () => chartApi.getBarData(),
  })
}

export function usePieChartData() {
  return useQuery({
    queryKey: ["charts", "pie"],
    queryFn: () => chartApi.getPieData(),
  })
}

export function useAreaChartData() {
  return useQuery({
    queryKey: ["charts", "area"],
    queryFn: () => chartApi.getAreaData(),
  })
}
