import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { db, doc, setDoc, getDoc, serverTimestamp, OperationType, handleFirestoreError } from "../lib/firebase";
import { Users, Plus, ArrowRight, ShieldAlert, LogOut, Compass } from "lucide-react";
import { Room } from "../types";

interface RoomSelectorProps {
  user: any;
  onRoomConnected: (roomCode: string, isCreator: boolean) => void;
  onLogout: () => void;
}

export default function RoomSelector({ user, onRoomConnected, onLogout }: RoomSelectorProps) {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    const code = generateRoomCode();
    try {
      const roomRef = doc(db, "rooms", code);
      
      const newRoom: Room = {
        code,
        creatorId: user.uid,
        creatorName: user.displayName || "Unknown Friend",
        createdAt: serverTimestamp(),
      };

      await setDoc(roomRef, newRoom);
      onRoomConnected(code, true);
    } catch (err: any) {
      console.error("Create room error:", err);
      if (err.message && err.message.includes("permission")) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `rooms/${code}`);
        } catch (wrappedErr: any) {
          setError(`Permission Denied: Ensure Firestore rules are deployed for database "ai-studio-401e97f3-5fd9-4328-bc36-6dcbc9a1e202"`);
        }
      } else {
        setError(err.message || "Failed to create room. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);
    setError(null);
    const formattedCode = roomCode.trim().toUpperCase();

    try {
      const roomRef = doc(db, "rooms", formattedCode);
      let roomSnap;
      try {
        roomSnap = await getDoc(roomRef);
      } catch (err: any) {
        if (err.message && err.message.includes("permission")) {
          handleFirestoreError(err, OperationType.GET, `rooms/${formattedCode}`);
        }
        throw err;
      }

      if (!roomSnap.exists()) {
        setError(`Room "${formattedCode}" not found. Double check the code or create a new room.`);
        setLoading(false);
        return;
      }

      onRoomConnected(formattedCode, false);
    } catch (err: any) {
      console.error("Join room error:", err);
      if (err.message && err.message.includes("permission")) {
        setError(`Permission Denied: Ensure Firestore rules are deployed for database "ai-studio-401e97f3-5fd9-4328-bc36-6dcbc9a1e202"`);
      } else {
        setError(err.message || "Failed to join room. Please check your connection.");
      }
      setLoading(false);
    }
  };

  return (
    <div id="room-selector-container" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* Top right logout */}
      <div className="absolute top-4 right-4 z-20">
        <button
          id="logout-btn"
          onClick={onLogout}
          className="flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 transition-all text-xs font-semibold cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <motion.div
        id="room-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10 text-slate-100"
      >
        <div id="user-greeting" className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
          <img
            id="user-avatar"
            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
            alt={user.displayName || "Avatar"}
            className="w-12 h-12 rounded-full border-2 border-teal-500/50 object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-xs font-mono text-teal-400">WELCOME BACK</span>
            <h2 id="user-displayname" className="text-lg font-bold text-slate-100 truncate max-w-[200px]">
              {user.displayName || "Friend"}
            </h2>
          </div>
        </div>

        <h3 id="room-card-title" className="text-xl font-extrabold mb-2 tracking-tight text-slate-100">
          Connect to Friend Finder Room
        </h3>
        <p id="room-card-desc" className="text-slate-400 text-sm mb-6">
          Create a private tracking room, or enter a room code provided by your friend to join.
        </p>

        {error && (
          <motion.div
            id="room-error-alert"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-left text-rose-300 text-xs"
          >
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Create Room Option */}
          <button
            id="create-room-btn"
            disabled={loading}
            onClick={handleCreateRoom}
            className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/10 transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm">Create New Room</p>
                <p className="text-[11px] text-teal-100 font-normal">Generate a code to invite friends</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700/50"></div>
            <span className="flex-shrink mx-4 text-xs font-mono text-slate-500 uppercase">OR JOIN EXISTING</span>
            <div className="flex-grow border-t border-slate-700/50"></div>
          </div>

          {/* Join Room Form */}
          <form id="join-room-form" onSubmit={handleJoinRoom} className="space-y-3">
            <div>
              <label htmlFor="roomCode" className="block text-xs font-mono text-slate-400 uppercase mb-2">
                Enter Room Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="roomCode"
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. AD56X9"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-semibold tracking-wider uppercase transition-all outline-none"
                />
              </div>
            </div>

            <button
              id="join-room-btn"
              type="submit"
              disabled={loading || !roomCode.trim()}
              className="w-full py-3.5 px-5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-40 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Join Friend Room</span>
              )}
            </button>
          </form>
        </div>

        <div id="room-footer" className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center gap-3 text-[10px] text-slate-500 font-mono">
          <Compass className="h-3.5 w-3.5 animate-spin text-slate-600" style={{ animationDuration: "12s" }} />
          <span>Active sessions are automatically garbage collected</span>
        </div>
      </motion.div>
    </div>
  );
}
