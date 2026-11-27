import React, { useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Brain,
  LayoutDashboard,
  Film,
  BarChart2,
  Trophy,
  LogOut,
  Sparkles,
  Menu,
  X,
  Server,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "./ThemeToggle"
import { Dropdown } from "@/components/ui/dropdown"
import { getApiBaseUrl, setDynamicApiPort } from "@/services/api"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPortModalOpen, setIsPortModalOpen] = useState(false)
  const [customPortInput, setCustomPortInput] = useState("")

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Playlists", path: "/dashboard/playlists", icon: Film, badge: "Phase 2" },
    { label: "Analytics", path: "/dashboard/analytics", icon: BarChart2, badge: "Phase 5" },
    { label: "Achievements", path: "/dashboard/achievements", icon: Trophy, badge: "Phase 6" },
  ]

  const handleLogout = () => {
    logout()
    toast.success("Successfully logged out")
    navigate("/login")
  }

  const handleUpdatePort = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPortInput.trim()) return
    const updated = setDynamicApiPort(customPortInput.trim())
    toast.success(`Backend API switched to: ${updated}`)
    setIsPortModalOpen(false)
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              CogneLearn
            </span>
            <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Focused Learning
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 dark:bg-indigo-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom System & User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {/* Dynamic Port Indicator Button */}
          <button
            onClick={() => {
              setCustomPortInput("")
              setIsPortModalOpen(true)
            }}
            title="Click to change dynamic API port"
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-mono">
              <Server className="h-3.5 w-3.5 text-emerald-500" />
              API: {getApiBaseUrl().replace(/https?:\/\//, "")}
            </span>
            <span className="text-[10px] underline text-indigo-500">Edit</span>
          </button>

          {/* XP Tracker Capsule */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Focus XP</span>
            </div>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {user?.xpPoints ?? 0} pts
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <Brain className="h-6 w-6 text-indigo-600" />
              <span className="font-bold text-base bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                CogneLearn
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Profile Dropdown */}
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold leading-none text-slate-800 dark:text-slate-200">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{user?.email}</p>
                  </div>
                </div>
              }
              items={[
                {
                  label: `${user?.name} (${user?.role})`,
                  onClick: () => {},
                },
                {
                  label: `XP: ${user?.xpPoints ?? 0}`,
                  icon: <Sparkles className="h-4 w-4 text-amber-500" />,
                  onClick: () => {},
                  divider: true,
                },
                {
                  label: "Logout",
                  icon: <LogOut className="h-4 w-4 text-rose-500" />,
                  destructive: true,
                  onClick: handleLogout,
                },
              ]}
            />
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 flex w-72 flex-col bg-white dark:bg-slate-900 p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-indigo-600" />
                  <span className="font-bold text-lg text-slate-900 dark:text-slate-100">CogneLearn</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Dynamic Port Configuration Modal */}
      <Dialog
        open={isPortModalOpen}
        onClose={() => setIsPortModalOpen(false)}
        title="Configure Backend API Port"
        description="Switch your local backend port dynamically without restarting the frontend server."
      >
        <form onSubmit={handleUpdatePort} className="space-y-4">
          <Input
            label="Backend Port or Full URL"
            placeholder="e.g. 8080, 8081, or http://192.168.1.5:8080"
            value={customPortInput}
            onChange={(e) => setCustomPortInput(e.target.value)}
            hint={`Current API Base: ${getApiBaseUrl()}`}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPortModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save & Switch</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
