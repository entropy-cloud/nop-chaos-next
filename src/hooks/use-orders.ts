import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { orderApi } from "@/api"
import type { Order, OrderItem } from "@/types"

export function useOrders(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["orders", page, pageSize],
    queryFn: () => orderApi.getList(page, pageSize),
  })
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => orderApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: Omit<Order, "id" | "createdAt">) => orderApi.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, order }: { id: number; order: Partial<Order> }) =>
      orderApi.update(id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}

export function useOrderItems(orderId: number) {
  return useQuery({
    queryKey: ["orders", orderId, "items"],
    queryFn: () => orderApi.getItems(orderId),
    enabled: !!orderId,
  })
}

export function useAddOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      item,
    }: {
      orderId: number
      item: Omit<OrderItem, "id" | "orderId">
    }) => orderApi.addItem(orderId, item),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId, "items"] })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      item,
    }: {
      orderId: number
      itemId: number
      item: Partial<OrderItem>
    }) => orderApi.updateItem(orderId, itemId, item),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId, "items"] })
    },
  })
}

export function useDeleteOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: number; itemId: number }) =>
      orderApi.deleteItem(orderId, itemId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId, "items"] })
    },
  })
}
