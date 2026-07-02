import { useState } from "react";
import { motion } from "motion/react";
import { auth, googleProvider, signInWithPopup } from "../lib/firebase";
import { MapPin, ShieldAlert, Navigation, Compass } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* Pulsing visual circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      <motion.div
        id="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10 text-center text-slate-100"
      >
        <div id="login-icon-header" className="flex justify-center mb-6 relative">
          <div className="bg-gradient-to-tr from-blue-500 to-teal-400 p-4 rounded-2xl shadow-lg relative">
            <MapPin className="h-10 w-10 text-slate-900 animate-bounce" />
            <Navigation className="h-5 w-5 text-teal-800 absolute -top-1 -right-1 rotate-45 animate-pulse" />
          </div>
        </div>

        <h1 id="login-title" className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent mb-2">
          Friend Finder
        </h1>
        <p id="login-subtitle" className="text-slate-400 mb-8 max-w-sm mx-auto text-sm">
          Track friends' real-time locations, share rooms, calculate exact routing, and measure approaching speeds.
        </p>

        {error && (
          <motion.div
            id="login-error-alert"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-left text-rose-300 text-xs"
          >
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <button
          id="google-login-btn"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-5 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-200 disabled:opacity-50 group cursor-pointer"
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span className="group-hover:translate-x-0.5 transition-transform">
            {loading ? "Connecting..." : "Sign in with Google"}
          </span>
        </button>

        <div id="login-footer" className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center gap-6 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <Compass className="h-3 w-3 animate-spin" style={{ animationDuration: "10s" }} />
            <span>REALTIME GPS</span>
          </div>
          <div>•</div>
          <div>SECURE ROOMS</div>
          <div>•</div>
          <div>DIRECTIONS API</div>
        </div>
      </motion.div>
    </div>
  );
}
