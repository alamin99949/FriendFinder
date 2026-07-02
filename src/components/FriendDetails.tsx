import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RoomMember, DistanceHistoryEntry } from "../types";
import { 
  Navigation, 
  MapPin, 
  TrendingUp, 
  Gauge, 
  Zap, 
  Clock, 
  Compass, 
  Milestone,
  BellRing
} from "lucide-react";
import { db, doc, updateDoc, serverTimestamp, OperationType, handleFirestoreError } from "../lib/firebase";

interface FriendDetailsProps {
  friend: RoomMember;
  myLocation: { lat: number; lng: number; speed: number | null } | null;
  routeInfo: { distanceMeters: number; durationMillis: number } | null;
  roomCode: string;
}

export default function FriendDetails({ friend, myLocation, routeInfo, roomCode }: FriendDetailsProps) {
  const [distanceHistory, setDistanceHistory] = useState<DistanceHistoryEntry[]>([]);
  const [approachingSpeed, setApproachingSpeed] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);

  // Calculate relative approaching speed on routeInfo (distance) updates
  useEffect(() => {
    if (!routeInfo) {
      setDistanceHistory([]);
      setApproachingSpeed(null);
      return;
    }

    const currentDistance = routeInfo.distanceMeters;
    const now = Date.now();

    setDistanceHistory((prev) => {
      const updated = [...prev, { distance: currentDistance, timestamp: now }];
      // Keep only last 5 entries to calculate a smoothed speed
      const trimmed = updated.slice(-5);

      if (trimmed.length >= 2) {
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        const dt = (last.timestamp - first.timestamp) / 1000; // in seconds
        const dDist = first.distance - last.distance; // in meters (positive means closing in)

        if (dt > 1) {
          const mps = dDist / dt;
          const kmh = mps * 3.6;
          // Smooth the display speed
          setApproachingSpeed(kmh);
        }
      } else {
        setApproachingSpeed(null);
      }

      return trimmed;
    });
  }, [routeInfo?.distanceMeters]);

  // Convert Speed (m/s) to km/h
  const formatSpeed = (speedMPS: number | null) => {
    if (speedMPS === null || speedMPS === undefined) return "0.0";
    return (speedMPS * 3.6).toFixed(1);
  };

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Format ETA
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Live Ping/Buzzer feature
  const handlePingFriend = async () => {
    if (isPinging) return;
    setIsPinging(true);
    setPingSuccess(false);
    try {
      // Write ping event directly to friend's document inside room members
      const friendRef = doc(db, "rooms", roomCode, "members", friend.uid);
      await updateDoc(friendRef, {
        pingedAt: serverTimestamp(),
      });
      setPingSuccess(true);
      setTimeout(() => setPingSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error pinging friend:", err);
      if (err.message && err.message.includes("permission")) {
        handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomCode}/members/${friend.uid}`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <motion.div
      id="friend-details-panel"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-sans max-w-sm w-full"
    >
      {/* Friend identity header */}
      <div id="friend-identity" className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <img
            id="friend-details-avatar"
            src={friend.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`}
            alt={friend.displayName}
            className="w-11 h-11 rounded-full border-2 border-blue-500 object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h3 id="friend-details-name" className="text-sm font-bold text-slate-100 truncate max-w-[150px]">
              {friend.displayName}
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE LOCATING
            </span>
          </div>
        </div>

        {/* Live Ping Button */}
        <button
          id="ping-friend-btn"
          disabled={isPinging}
          onClick={handlePingFriend}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            pingSuccess 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-500/10"
          }`}
        >
          <BellRing className={`h-3.5 w-3.5 ${isPinging ? "animate-bounce" : ""}`} />
          <span>{pingSuccess ? "PINGED!" : isPinging ? "Pinging..." : "BUZZ"}</span>
        </button>
      </div>

      {/* Navigation Stats Row */}
      {routeInfo ? (
        <div id="navigation-grid" className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg shrink-0">
              <Milestone className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Distance</p>
              <h4 className="text-sm font-black text-slate-100">{formatDistance(routeInfo.distanceMeters)}</h4>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="bg-teal-500/10 p-2 rounded-lg shrink-0">
              <Clock className="h-4 w-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Est. ETA</p>
              <h4 className="text-sm font-black text-slate-100">{formatDuration(routeInfo.durationMillis)}</h4>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 bg-slate-800/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
          Loading route data...
        </div>
      )}

      {/* Speeds & Approaching Velocity Dashboard */}
      <div id="speeds-dashboard" className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
        {/* Approaching Speed Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-2.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            Approach Vector
          </span>
          {approachingSpeed !== null ? (
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              approachingSpeed > 0.5 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : approachingSpeed < -0.5 
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                  : "bg-slate-700/30 text-slate-400"
            }`}>
              {approachingSpeed > 0.5 
                ? `CLOSING @ +${approachingSpeed.toFixed(1)} km/h` 
                : approachingSpeed < -0.5 
                  ? `DIVERTING @ ${approachingSpeed.toFixed(1)} km/h` 
                  : "STATIONARY DISTANCE"
              }
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-500">CALCULATING...</span>
          )}
        </div>

        {/* Realtime Speed Values */}
        <div className="grid grid-cols-2 gap-4">
          {/* User Speed */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500 uppercase">YOUR SPEED</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-slate-100">{formatSpeed(myLocation?.speed ?? null)}</span>
              <span className="text-[10px] text-slate-400">km/h</span>
            </div>
          </div>

          {/* Friend Speed */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500 uppercase">{friend.displayName.split(" ")[0]}'S SPEED</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-slate-100">{formatSpeed(friend.speed)}</span>
              <span className="text-[10px] text-slate-400">km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Route Navigation Details */}
      <div id="route-footer" className="text-[10px] text-slate-400 font-medium flex items-center gap-2 justify-center bg-blue-500/5 py-2 px-3 border border-blue-500/10 rounded-xl">
        <Navigation className="h-3.5 w-3.5 text-blue-400 animate-pulse shrink-0" />
        <span>Directions update dynamically on GPS signal change.</span>
      </div>
    </motion.div>
  );
}
