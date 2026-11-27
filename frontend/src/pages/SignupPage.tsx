import React, { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Brain, Lock, Mail, User as UserIcon, Eye, EyeOff, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"

export const SignupPage: React.FC = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Password Strength Evaluation
  const strengthChecks = useMemo(() => {
    return [
      { label: "At least 6 characters", valid: password.length >= 6 },
      { label: "Includes uppercase & lowercase", valid: /[a-z]/.test(password) && /[A-Z]/.test(password) },
      { label: "Includes at least 1 number", valid: /\d/.test(password) },
    ]
  }, [password])

  const strengthScore = useMemo(() => {
    return strengthChecks.filter((c) => c.valid).length
  }, [strengthChecks])

  const strengthColors = ["bg-slate-200 dark:bg-slate-800", "bg-rose-500", "bg-amber-500", "bg-emerald-500"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("All fields are required.")
      return
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)
    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
      toast.success("Account created successfully!")
      navigate("/dashboard", { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account. Please try again."
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
            Create your account
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join focused learners boosting productivity
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Enter your profile details to get started</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {errorMessage}
                </div>
              )}

              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<UserIcon className="h-4 w-4" />}
                required
                maxLength={100}
                autoComplete="name"
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
                maxLength={254}
                autoComplete="email"
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
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
                maxLength={128}
                autoComplete="new-password"
              />

              {/* Password Strength Checklist */}
              {password && (
                <div className="space-y-2 pt-1">
                  <div className="flex h-1.5 w-full gap-1">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strengthScore >= step ? strengthColors[strengthScore] : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    {strengthChecks.map((chk, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px]">
                        {chk.valid ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className={chk.valid ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}>
                          {chk.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create Account
              </Button>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
