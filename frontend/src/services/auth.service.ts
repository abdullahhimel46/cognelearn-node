import { api } from "./api"
import type { AuthResponse, LoginPayload, SignupPayload, User } from "@/types/auth"

export const authService = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/v1/auth/signup", payload)
    return response.data
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/v1/auth/login", payload)
    return response.data
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/api/v1/auth/me")
    return response.data
  },
}
