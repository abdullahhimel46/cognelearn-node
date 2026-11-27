export interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  xpPoints: number
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  password: string
}

export interface ApiError {
  message: string
  status?: number
}
