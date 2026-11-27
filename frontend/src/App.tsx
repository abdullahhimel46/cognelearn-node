import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedRoute } from "@/components/common/ProtectedRoute"
import { PublicRoute } from "@/components/common/PublicRoute"
import { AppLayout } from "@/components/common/AppLayout"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { DashboardPage } from "@/pages/DashboardPage"

// Minimal placeholder stubs for upcoming phase routes
const PhasePlaceholder: React.FC<{ phase: string; title: string }> = ({ phase, title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
    <div className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 p-4 mb-4">
      <span className="text-2xl">🚀</span>
    </div>
    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
      {phase}
    </span>
    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
      This section is scheduled for implementation in the next phase of the CogneLearn roadmap.
    </p>
  </div>
)

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Only For Unauthenticated Users */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                  path="/dashboard/playlists"
                  element={<PhasePlaceholder phase="Phase 2" title="Playlist Hub & YouTube Import" />}
                />
                <Route
                  path="/dashboard/analytics"
                  element={<PhasePlaceholder phase="Phase 5" title="Deep Analytics & Post-Session Reports" />}
                />
                <Route
                  path="/dashboard/achievements"
                  element={<PhasePlaceholder phase="Phase 6" title="Gamification, Badges & XP Hub" />}
                />
              </Route>
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
