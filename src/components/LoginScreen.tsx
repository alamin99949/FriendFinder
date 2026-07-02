import { useState, useEffect, FormEvent } from "react";
import { motion } from "motion/react";
import { MapPin, User, ArrowRight, Compass, Navigation } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: { uid: string; displayName: string; photoURL: string }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Update avatar preview seed as they type or on initial load
  useEffect(() => {
    if (displayName.trim()) {
      setAvatarSeed(displayName.trim().toLowerCase());
    } else {
      setAvatarSeed("default");
    }
  }, [displayName]);

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter a name or nickname to continue.");
      return;
    }

    const uniqueId = `usr_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;

    const newUser = {
      uid: uniqueId,
      displayName: displayName.trim(),
      photoURL: avatarUrl,
    };

    // Store in localStorage for persistence across reloads
    localStorage.setItem("friend_finder_user", JSON.stringify(newUser));
    onLoginSuccess(newUser);
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;

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
        <p id="login-subtitle" className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
          Track friends' real-time locations, calculate exact routing, and measure approaching speeds.
        </p>

        {/* Dynamic Interactive Avatar Preview */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-full bg-slate-900/90 border-2 border-teal-500/60 p-1 shadow-lg flex items-center justify-center overflow-hidden">
            <img
              src={currentAvatarUrl}
              alt="Your Live Avatar"
              className="w-20 h-20 rounded-full object-cover transition-transform hover:scale-110 duration-300"
              onError={(e) => {
                // Fail-safe default
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=default`;
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-2 uppercase">Your Interactive Companion</span>
        </div>

        <form onSubmit={handleStart} className="space-y-4 text-left">
          <div>
            <label htmlFor="nickname" className="block text-xs font-mono text-slate-400 uppercase mb-2">
              Enter Your Name / Nickname
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <input
                id="nickname"
                type="text"
                required
                maxLength={20}
                placeholder="e.g. SpeedRacer, John, Explorer"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-semibold transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-mono mt-1">{error}</p>
          )}

          <button
            id="start-session-btn"
            type="submit"
            className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-between group cursor-pointer"
          >
            <span>Let's Get Tracking</span>
            <ArrowRight className="h-5 w-5 opacity-80 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

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
