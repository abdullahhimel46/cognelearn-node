import React from "react"
import { Link } from "react-router-dom"
import {
  Brain,
  Sparkles,
  ArrowRight,
  Focus,
  PlaySquare,
  LineChart,
  Medal,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { useAuth } from "@/context/AuthContext"

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: <PlaySquare className="h-6 w-6 text-rose-500" />,
      title: "YouTube Auto-Import",
      description: "Paste any YouTube playlist URL or ID and automatically curate clean, distraction-free study courses.",
    },
    {
      icon: <Focus className="h-6 w-6 text-indigo-500" />,
      title: "Focus & Pomodoro Timer",
      description: "Structured 25-minute study intervals synced directly with your video watch progress.",
    },
    {
      icon: <Brain className="h-6 w-6 text-violet-500" />,
      title: "AI Attention Tracking",
      description: "On-device MediaPipe computer vision measures your focus, blink gaze, and presence in real-time.",
    },
    {
      icon: <LineChart className="h-6 w-6 text-emerald-500" />,
      title: "Deep Session Analytics",
      description: "Interactive timeline curves, attention heatmaps, and post-session focus score reviews.",
    },
    {
      icon: <Medal className="h-6 w-6 text-amber-500" />,
      title: "Gamification & XP",
      description: "Level up your study habit, earn achievements, and maintain study streaks with celebratory badges.",
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-cyan-500" />,
      title: "Full Privacy Shield",
      description: "Computer vision processing runs locally in your browser. Video feeds never touch the server.",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Brain className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              CogneLearn
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Focused Learning Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]">
            Master Any Subject with{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400">
              Laser-Sharp Focus
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Turn YouTube video playlists into distraction-free study courses. Track real-time attention with
            on-device AI, stay accountable with Pomodoro sessions, and level up your knowledge.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-indigo-600/25" asChild>
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                Start Learning Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isAuthenticated && (
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
                <Link to="/login">Sign In to Existing Account</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/15 to-violet-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-16 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Engineered for Deep Learning
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              A comprehensive platform combining video study workflows, computer-vision attention tracking, and gamification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800"
              >
                <div className="mb-4 inline-flex rounded-xl bg-white dark:bg-slate-800 p-3 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} CogneLearn Engine. Built for focused learners.</p>
      </footer>
    </div>
  )
}
