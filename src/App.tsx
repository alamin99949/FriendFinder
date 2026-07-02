import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut,
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc,
  collection,
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from "./lib/firebase";
import { RoomMember } from "./types";

import LoginScreen from "./components/LoginScreen";
import RoomSelector from "./components/RoomSelector";
import Header from "./components/Header";
import MapContainer from "./components/MapContainer";
import FriendDetails from "./components/FriendDetails";

import { 
  MapPin, 
  Bell, 
  RefreshCw, 
  Navigation, 
  Compass, 
  AlertTriangle, 
  Users, 
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  X
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; speed: number | null } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceMeters: number; durationMillis: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [pingAlert, setPingAlert] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // References for keeping track of live tracking and listeners
  const watchIdRef = useRef<number | null>(null);
  const lastPingHandledRef = useRef<any>(null);

  // 1. Subscribe to Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Subscription to Room Members and Pings
  useEffect(() => {
    if (!roomCode || !user) {
      setMembers([]);
      return;
    }

    // Subscribe to rooms/{roomCode}/members collection
    const membersColRef = collection(db, "rooms", roomCode, "members");
    const unsubscribeMembers = onSnapshot(membersColRef, (snapshot) => {
      const membersList: RoomMember[] = [];
      snapshot.forEach((doc) => {
        membersList.push(doc.data() as RoomMember);
      });
      setMembers(membersList);

      // Inspect our own member record to see if we've been pinged/buzzed!
      const me = membersList.find((m) => m.uid === user.uid);
      if (me && (me as any).pingedAt) {
        const pingTime = (me as any).pingedAt?.toDate 
          ? (me as any).pingedAt.toDate().getTime() 
          : new Date((me as any).pingedAt).getTime();

        if (!lastPingHandledRef.current || pingTime > lastPingHandledRef.current) {
          lastPingHandledRef.current = pingTime;
          // Trigger visual buzzer/alert
          setPingAlert(`🚨 YOUR FRIEND PINGED YOU! 🚨`);
          // Support device vibration if available
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 300]);
          }
          // Auto dismiss alert
          setTimeout(() => setPingAlert(null), 4000);
        }
      }
    }, (error) => {
      console.error("Realtime subscription error:", error);
      if (error.message && error.message.includes("permission")) {
        handleFirestoreError(error, OperationType.LIST, `rooms/${roomCode}/members`);
      }
    });

    return () => {
      unsubscribeMembers();
    };
  }, [roomCode, user]);

  // Sync selected friend detail reference when member locations update
  useEffect(() => {
    if (selectedMember && members.length > 0) {
      const updatedFriend = members.find((m) => m.uid === selectedMember.uid);
      if (updatedFriend) {
        setSelectedMember(updatedFriend);
      } else {
        // Friend left room
        setSelectedMember(null);
        setRouteInfo(null);
      }
    }
  }, [members]);

  // Update location document in rooms/{roomCode}/members/{myUid}
  const updateMyLocation = async (lat: number, lng: number, speed: number | null = null, heading: number | null = null, accuracy: number | null = null) => {
    setMyLocation({ lat, lng, speed });
    if (!roomCode || !user) return;
    try {
      const myMemberRef = doc(db, "rooms", roomCode, "members", user.uid);
      await setDoc(myMemberRef, {
        uid: user.uid,
        displayName: user.displayName || "Unknown Friend",
        email: user.email || "",
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        lat,
        lng,
        speed: speed ?? null,
        heading: heading ?? null,
        accuracy: accuracy ?? null,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (err: any) {
      console.error("Error writing location to Firestore:", err);
      if (err.message && err.message.includes("permission")) {
        handleFirestoreError(err, OperationType.WRITE, `rooms/${roomCode}/members/${user.uid}`);
      }
    }
  };

  const startSimulation = async () => {
    setIsSimulating(true);
    setGeoError(null);
    setIsSharing(true);
    
    // Clear any active geolocation watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Default coordinates (San Francisco)
    let initialLat = 37.7749;
    let initialLng = -122.4194;

    // Place next to another active member if any exist so they are immediately visible on screen!
    const otherMember = members.find((m) => m.uid !== user?.uid);
    if (otherMember) {
      initialLat = otherMember.lat + 0.003;
      initialLng = otherMember.lng + 0.003;
    }

    await updateMyLocation(initialLat, initialLng, 0);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!isSimulating) return;
    
    // Dynamically calculate speed based on distance traveled between map clicks to mock movements!
    let calculatedSpeed = 0;
    if (myLocation) {
      const R = 6371000; // Earth radius in meters
      const dLat = ((lat - myLocation.lat) * Math.PI) / 180;
      const dLon = ((lng - myLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((myLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      if (distance > 2) {
        // High distance (e.g. >1km) indicates driving simulation, low indicates walking
        calculatedSpeed = distance > 1000 ? 14.5 : 1.4;
      }
    }

    await updateMyLocation(lat, lng, calculatedSpeed);
  };

  // 3. Geolocation Watch Position Setup
  useEffect(() => {
    if (!roomCode || !user) {
      // Cleanup watch when room exited or logged out
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharing(false);
      return;
    }

    if (isSimulating) {
      setIsSharing(true);
      return;
    }

    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Tracking is disabled.");
      return;
    }

    const startWatching = () => {
      setIsSharing(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, speed, heading, accuracy } = position.coords;
          await updateMyLocation(latitude, longitude, speed, heading, accuracy);
        },
        (error) => {
          console.error("GPS watchPosition error:", error);
          setIsSharing(false);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              setGeoError("Location access denied. Please allow location permissions in your browser to share and track.");
              break;
            case error.POSITION_UNAVAILABLE:
              setGeoError("Location info unavailable. Ensure GPS is enabled.");
              break;
            case error.TIMEOUT:
              setGeoError("Location request timed out. Retrying...");
              break;
            default:
              setGeoError("Failed to resolve GPS coordinates.");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
    };

    startWatching();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharing(false);
    };
  }, [roomCode, user, isSimulating]);

  const handleRoomConnected = (code: string, creator: boolean) => {
    setRoomCode(code);
    setIsCreator(creator);
  };

  const handleLeaveRoom = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (roomCode && user) {
      try {
        // Clean up my presence in the room
        const myMemberRef = doc(db, "rooms", roomCode, "members", user.uid);
        await deleteDoc(myMemberRef);
      } catch (err: any) {
        console.error("Error deleting presence on room exit:", err);
        if (err.message && err.message.includes("permission")) {
          handleFirestoreError(err, OperationType.DELETE, `rooms/${roomCode}/members/${user.uid}`);
        }
      }
    }

    setRoomCode(null);
    setMembers([]);
    setSelectedMember(null);
    setRouteInfo(null);
    setMyLocation(null);
    setIsSharing(false);
    setGeoError(null);
  };

  const handleLogout = async () => {
    await handleLeaveRoom();
    await signOut(auth);
    setUser(null);
  };

  // Loader Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <Compass className="h-12 w-12 text-teal-400 animate-spin" />
          <span className="text-sm font-semibold tracking-wider font-mono uppercase">Initializing Friend Finder...</span>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  // Room Select Screen
  if (!roomCode) {
    return (
      <RoomSelector 
        user={user} 
        onRoomConnected={handleRoomConnected} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div id="main-app-container" className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dynamic Buzzer/Ping Alert Toast */}
      <AnimatePresence>
        {pingAlert && (
          <motion.div
            id="global-buzz-alert"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 border border-rose-400 text-white font-extrabold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce"
          >
            <Bell className="h-6 w-6 text-white animate-ring shrink-0" />
            <span className="text-sm tracking-wide font-black uppercase text-center">{pingAlert}</span>
            <button 
              id="close-buzz-btn" 
              onClick={() => setPingAlert(null)} 
              className="p-1 hover:bg-white/10 rounded-lg cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Header 
        roomCode={roomCode} 
        memberCount={members.length} 
        user={user} 
        onLeaveRoom={handleLeaveRoom}
        isSharing={isSharing}
      />

      {/* Main Map + Sidebar Content Area */}
      <div id="workspace-layout" className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* Left Side: Real-time Map Canvas */}
        <div id="map-workspace" className="flex-1 relative bg-slate-900">
          <MapContainer 
            members={members} 
            myUid={user.uid} 
            selectedMember={selectedMember}
            onSelectMember={(m) => {
              setSelectedMember(m);
              if (!m) setRouteInfo(null);
            }}
            myLocation={myLocation}
            onRouteInfo={(info) => setRouteInfo(info)}
            isSimulating={isSimulating}
            onMapClick={handleMapClick}
          />

          {/* Floating Instructions/Status Card */}
          <div id="map-overlay-instructions" className="absolute top-4 left-4 z-10 max-w-xs bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg pointer-events-none select-none text-xs text-slate-300">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
              <Info className="h-4 w-4 text-teal-400 shrink-0" />
              How to Track:
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Share the Room Code with friends. Once they join, click on any friend avatar on the map to find direct routing, distance, and approaching speeds.
            </p>
          </div>

          {/* GPS Error Panel */}
          {geoError && (
            <div id="gps-error-banner" className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/95 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl max-w-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-rose-300 uppercase tracking-wide">GPS Permission Required</h5>
                  <p className="text-[11px] text-rose-400 mt-1 leading-relaxed">
                    {geoError}
                  </p>
                </div>
              </div>
              <button
                onClick={startSimulation}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-md transition-all shrink-0 cursor-pointer text-center"
              >
                Simulate Location
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Active Room Friends & Tracking Info (Desktop: Sidebar, Mobile: Bottom Sheet overlay) */}
        <div id="room-members-sidebar" className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none shrink-0 z-10">
          
          {/* Section 1: Friend Details (Only visible when a friend is selected) */}
          <div id="sidebar-context-panel" className="p-4 border-b border-slate-800/80 bg-slate-900/40">
            <AnimatePresence mode="wait">
              {selectedMember ? (
                <FriendDetails 
                  friend={selectedMember} 
                  myLocation={myLocation} 
                  routeInfo={routeInfo}
                  roomCode={roomCode}
                />
              ) : (
                <motion.div
                  key="no-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 text-center flex flex-col items-center justify-center gap-3 text-slate-500"
                >
                  <Navigation className="h-8 w-8 text-slate-600 animate-pulse" />
                  <p className="text-xs font-medium max-w-[200px]">
                    Select a friend on the map or from the list below to start routing.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: Active Friends List */}
          <div id="members-list-section" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between select-none shrink-0">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-teal-400" />
                Active Friends ({members.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">REALTIME SYNC</span>
            </div>

            <div id="members-list-scrollable" className="flex-1 overflow-y-auto p-4 space-y-2">
              {members.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Subscribing to session...</span>
                </div>
              ) : (
                members.map((member) => {
                  const isMe = member.uid === user.uid;
                  const isSelected = selectedMember?.uid === member.uid;

                  return (
                    <button
                      id={`member-row-${member.uid}`}
                      key={member.uid}
                      disabled={isMe}
                      onClick={() => {
                        setSelectedMember(isSelected ? null : member);
                        if (isSelected) setRouteInfo(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isMe 
                          ? "bg-slate-800/10 border-slate-800/30 opacity-60 cursor-default" 
                          : isSelected
                            ? "bg-blue-600/10 border-blue-500/50 hover:bg-blue-600/15"
                            : "bg-slate-800/40 hover:bg-slate-800/80 border-slate-800/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.uid}`}
                          alt={member.displayName}
                          className={`w-9 h-9 rounded-full object-cover border-2 ${
                            isMe ? "border-teal-500/50" : "border-slate-700"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="truncate max-w-[150px]">
                          <h4 className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                            {member.displayName}
                            {isMe && (
                              <span className="text-[9px] font-bold font-mono px-1 rounded bg-teal-500/10 text-teal-400">YOU</span>
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {member.speed && member.speed > 0.5 
                              ? `Moving at ${Math.round(member.speed * 3.6)} km/h` 
                              : "Stationary"
                            }
                          </span>
                        </div>
                      </div>

                      {!isMe && (
                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="text-[9px] font-mono text-blue-400 font-bold uppercase shrink-0">NAVIGATING</span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-400 shrink-0">TRACK</span>
                          )}
                          <Navigation className={`h-3 w-3 ${isSelected ? "text-blue-400" : "text-slate-600"}`} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
