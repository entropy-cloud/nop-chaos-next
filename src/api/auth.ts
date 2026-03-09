import { api } from "./client"

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: number
    name: string
    email: string
    role: string
  }
  token: string
  success: boolean
  message?: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>("/auth/login", data)
  },
}
