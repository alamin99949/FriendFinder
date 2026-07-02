import { useState } from "react";
import { motion } from "motion/react";
import { Copy, Check, Users, LogOut, Compass, MapPin } from "lucide-react";

interface HeaderProps {
  roomCode: string;
  memberCount: number;
  user: any;
  onLeaveRoom: () => void;
  isSharing: boolean;
}

export default function Header({ roomCode, memberCount, user, onLeaveRoom, isSharing }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy room code:", err);
    }
  };

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-sans shadow-lg relative z-20">
      {/* Brand Logo and Active Sharing Status */}
      <div id="header-left" className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-blue-500 to-teal-400 p-2.5 rounded-xl shadow-md">
          <Compass className="h-5 w-5 text-slate-900 animate-spin" style={{ animationDuration: "12s" }} />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
            Friend Finder
            {isSharing ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                SHARING LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                GPS DISABLED
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 font-medium">Real-time room navigation & tracker</p>
        </div>
      </div>

      {/* Room Controls: Code Pill and Member Count */}
      <div id="header-center" className="flex flex-wrap items-center gap-3">
        {/* Copy Room Code Pill */}
        <div id="room-code-pill" className="flex items-center bg-slate-800 border border-slate-700/60 rounded-xl pl-3 pr-1.5 py-1.5 shadow-sm">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mr-2 select-none">Room Code</span>
          <span className="text-sm font-extrabold font-mono text-teal-400 tracking-wider mr-3">{roomCode}</span>
          <button
            id="copy-code-btn"
            onClick={handleCopyCode}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Member Count Pill */}
        <div id="member-count-pill" className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 text-xs font-semibold shadow-sm select-none">
          <Users className="h-4 w-4 text-blue-400" />
          <span>{memberCount} Friend{memberCount !== 1 ? "s" : ""} in Room</span>
        </div>
      </div>

      {/* User Information & Exit Control */}
      <div id="header-right" className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
        <div className="flex items-center gap-2.5">
          <img
            id="user-header-avatar"
            src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid}`}
            alt={user?.displayName || "Avatar"}
            className="w-8.5 h-8.5 rounded-full border border-teal-500/50 object-cover shadow"
            referrerPolicy="no-referrer"
          />
          <div className="hidden lg:block text-left">
            <h4 className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
              {user?.displayName || "Me"}
            </h4>
            <p className="text-[10px] font-mono text-slate-500">Active user</p>
          </div>
        </div>

        <button
          id="exit-room-btn"
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition-all text-xs font-semibold cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit Room</span>
        </button>
      </div>
    </header>
  );
}
