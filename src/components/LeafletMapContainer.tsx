import { useState, useEffect, useRef } from "react";
import { RoomMember } from "../types";
import { Compass, Info, Navigation, ShieldCheck } from "lucide-react";

interface LeafletMapContainerProps {
  members: RoomMember[];
  myUid: string;
  selectedMember: RoomMember | null;
  onSelectMember: (member: RoomMember | null) => void;
  myLocation: { lat: number; lng: number; speed: number | null } | null;
  onRouteInfo: (info: { distanceMeters: number; durationMillis: number } | null) => void;
  onToggleToGoogleSetup?: () => void;
  isSimulating?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

// Haversine distance helper (meters)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LeafletMapContainer({
  members,
  myUid,
  selectedMember,
  onSelectMember,
  myLocation,
  onRouteInfo,
  onToggleToGoogleSetup,
  isSimulating,
  onMapClick,
}: LeafletMapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [uid: string]: any }>({});
  const polylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Load Leaflet Assets dynamically
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // 1. Inject Leaflet CSS
    const linkId = "leaflet-cdn-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS
    const scriptId = "leaflet-cdn-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        setLeafletLoaded(true);
      };
      script.onerror = () => {
        setLoadError("Failed to load map libraries. Please check your network connection.");
      };
      document.body.appendChild(script);
    } else {
      // Script is already in page but not fully initialized yet
      const interval = setInterval(() => {
        if ((window as any).L) {
          setLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const initialCenter = myLocation
      ? [myLocation.lat, myLocation.lng]
      : [37.422, -122.084];

    // If map already exists, do not recreate
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(initialCenter, 13);

      // Add a dark modern map layer matching our design guidelines
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(mapRef.current);

      mapRef.current.on("click", (e: any) => {
        if (onMapClickRef.current) {
          onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      // Clean up map on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        polylineRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Center map when user location changes
  useEffect(() => {
    if (mapRef.current && myLocation && leafletLoaded) {
      const L = (window as any).L;
      if (L) {
        mapRef.current.panTo([myLocation.lat, myLocation.lng]);
      }
    }
  }, [myLocation === null, leafletLoaded]);

  // Sync Markers and Polylines
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const activeUids = new Set(members.map((m) => m.uid));

    // Remove old markers no longer in the room
    Object.keys(markersRef.current).forEach((uid) => {
      if (!activeUids.has(uid)) {
        markersRef.current[uid].remove();
        delete markersRef.current[uid];
      }
    });

    // Add or update markers
    members.forEach((member) => {
      const isMe = member.uid === myUid;
      const isSelected = selectedMember?.uid === member.uid;
      const position = [member.lat, member.lng];

      // Custom HTML Marker matching Google Maps styles exactly
      const avatarUrl = member.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.uid}`;
      const nameLabel = isMe ? "You" : member.displayName.split(" ")[0];

      const htmlContent = `
        <div class="relative flex flex-col items-center select-none cursor-pointer" style="transform: translate(-50%, -100%); width: 80px;">
          <div class="relative rounded-full bg-slate-800 p-0.5 shadow-xl transition-all ${
            isSelected
              ? "ring-4 ring-blue-500 scale-110"
              : isMe
              ? "ring-4 ring-teal-500/70 scale-100"
              : "ring-2 ring-slate-600 scale-100 hover:scale-105"
          }">
            ${isMe ? '<div class="absolute inset-0 rounded-full bg-teal-400/30 animate-ping -z-10"></div>' : ""}
            <img
              src="${avatarUrl}"
              alt="${member.displayName}"
              class="w-10 h-10 rounded-full object-cover"
              style="width: 38px; height: 38px; border-radius: 9999px; object-fit: cover;"
              referrerpolicy="no-referrer"
            />
            ${
              member.speed && member.speed > 0.5
                ? `<span class="absolute -bottom-1 -right-1 bg-blue-600 border border-slate-800 text-[8px] font-bold px-1 rounded text-white flex items-center gap-0.5">
                    ${Math.round(member.speed * 3.6)}
                   </span>`
                : ""
            }
          </div>
          <div class="w-2.5 h-2.5 rotate-45 -mt-1 border-r border-b shadow-lg ${
            isSelected
              ? "bg-blue-500 border-blue-500"
              : isMe
              ? "bg-teal-500 border-teal-500"
              : "bg-slate-700 border-slate-700"
          }" style="width: 10px; height: 10px; transform: rotate(45deg); margin-top: -5px; z-index: 5;"></div>
          <span class="mt-1 bg-slate-900/90 border border-slate-800 text-[10px] font-bold text-slate-200 px-2 py-0.5 rounded shadow-lg backdrop-blur-sm truncate max-w-[75px]" style="pointer-events: none;">
            ${nameLabel}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: htmlContent,
        className: "custom-leaflet-marker",
        iconSize: [80, 80],
        iconAnchor: [40, 52],
      });

      if (markersRef.current[member.uid]) {
        // Update existing marker position & icon
        markersRef.current[member.uid].setLatLng(position);
        markersRef.current[member.uid].setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker(position, { icon: customIcon }).addTo(mapRef.current);
        marker.on("click", () => {
          if (isMe) return;
          onSelectMember(isSelected ? null : member);
        });
        markersRef.current[member.uid] = marker;
      }
    });

    // Draw route line if selected
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (myLocation && selectedMember) {
      const origin = [myLocation.lat, myLocation.lng];
      const dest = [selectedMember.lat, selectedMember.lng];

      // Standard blue routing polyline matching our premium guidelines
      polylineRef.current = L.polyline([origin, dest], {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapRef.current);

      // Fit map to show both markers
      const bounds = L.latLngBounds([origin, dest]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });

      // Calculate distance & mock route timing
      const distance = getHaversineDistance(myLocation.lat, myLocation.lng, selectedMember.lat, selectedMember.lng);
      // Average city speed: 40 km/h = 11.1 meters/sec
      const speedMPS = selectedMember.speed || 11.1;
      const durationMillis = (distance / speedMPS) * 1000;

      onRouteInfo({
        distanceMeters: distance,
        durationMillis: durationMillis,
      });
    } else {
      onRouteInfo(null);
    }
  }, [members, myUid, selectedMember, myLocation, leafletLoaded]);

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <Info className="h-8 w-8 text-rose-500 mb-2" />
        <p className="font-semibold text-rose-400">Map Loading Error</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Dynamic Leaflet Map Holder */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 min-h-[350px] z-0" />

      {/* Modern fallback notification badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 border border-slate-800 backdrop-blur-md py-2 px-4 rounded-full shadow-lg flex items-center gap-2 max-w-[90%] md:max-w-none text-center">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-mono font-medium text-slate-300">
          {isSimulating 
            ? "📍 Simulated GPS Active — Click map to reposition yourself"
            : "Running on OpenStreetMap Mode"
          }
        </span>
        {onToggleToGoogleSetup && !isSimulating && (
          <button
            onClick={onToggleToGoogleSetup}
            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline pl-1.5 border-l border-slate-800"
          >
            Setup Google Maps
          </button>
        )}
      </div>
    </div>
  );
}
