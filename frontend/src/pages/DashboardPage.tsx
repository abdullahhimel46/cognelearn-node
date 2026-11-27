import React from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import {
  Sparkles,
  Film,
  PlayCircle,
  Clock,
  Flame,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-indigo-100 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Welcome to Phase 1 Foundation</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.name || "Learner"}!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            Your CogneLearn authentication & layouts are live. Ready to connect your YouTube playlists in Phase 2.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-md font-semibold"
              asChild
            >
              <Link to="/dashboard/playlists">
                Go to Playlists (Phase 2) <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Focus XP Points</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user?.xpPoints ?? 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Earn XP by finishing study sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Playlists</CardTitle>
            <Film className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ready for YouTube import in Phase 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0 Days</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consistent daily focus tracker</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Focus Hours</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0.0 hrs</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recorded via Pomodoro study timer</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Phase Roadmap Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Phase 2 Next
              </span>
              <PlayCircle className="h-5 w-5 text-indigo-500" />
            </div>
            <CardTitle className="mt-2">Playlist Hub & YouTube Import</CardTitle>
            <CardDescription>
              Directly import full playlists from YouTube or create custom study lists with automatic video duration fetching.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              API mappings ready: <code className="font-mono text-indigo-600 dark:text-indigo-400">GET /api/v1/playlists</code>, <code className="font-mono text-indigo-600 dark:text-indigo-400">POST /api/v1/playlists/import-youtube</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                Phase 3 & 4
              </span>
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <CardTitle className="mt-2">Study Player & Attention Tracker</CardTitle>
            <CardDescription>
              Pomodoro study room synchronized with local browser MediaPipe face mesh to track real-time attention score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zero backend AI lag: 100% on-device client processing for maximum privacy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
