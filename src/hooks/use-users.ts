import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { userApi } from "@/api"
import type { User } from "@/types"

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => userApi.getList(),
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (user: Omit<User, "id" | "createdAt">) => userApi.create(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, user }: { id: number; user: Partial<User> }) =>
      userApi.update(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
