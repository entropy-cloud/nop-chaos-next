import { api } from "./client"
import type { MenuResponse } from "@/types/menu"

export async function getMenuConfig(): Promise<MenuResponse> {
  return api.get<MenuResponse>("/menus")
}

export async function fetchMenuByVersion(
  version?: string
): Promise<MenuResponse> {
  const params = version ? { version } : undefined
  return api.get<MenuResponse>("/menus", params)
}
