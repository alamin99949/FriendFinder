import { RoomMember } from "../types";
import LeafletMapContainer from "./LeafletMapContainer";

interface MapContainerProps {
  members: RoomMember[];
  myUid: string;
  selectedMember: RoomMember | null;
  onSelectMember: (member: RoomMember | null) => void;
  myLocation: { lat: number; lng: number; speed: number | null } | null;
  onRouteInfo: (info: { distanceMeters: number; durationMillis: number } | null) => void;
  isSimulating?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapContainer({
  members,
  myUid,
  selectedMember,
  onSelectMember,
  myLocation,
  onRouteInfo,
  isSimulating,
  onMapClick,
}: MapContainerProps) {
  return (
    <div id="map-canvas-container" className="w-full h-full relative" style={{ minHeight: "350px" }}>
      <LeafletMapContainer
        members={members}
        myUid={myUid}
        selectedMember={selectedMember}
        onSelectMember={onSelectMember}
        myLocation={myLocation}
        onRouteInfo={onRouteInfo}
        isSimulating={isSimulating}
        onMapClick={onMapClick}
      />
    </div>
  );
}
