import React, { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Brain, Lock, Mail, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    setIsLoading(true)
    try {
      await login({ email: email.trim(), password })
      toast.success("Welcome back!")
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <Brain className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              CogneLearn
            </span>
          </Link>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Continue your focused study sessions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your email and password below</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {errorMessage}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                required
                autoComplete="current-password"
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Sign In
              </Button>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{" "}
                <Link to="/signup" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  Sign up for free
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
