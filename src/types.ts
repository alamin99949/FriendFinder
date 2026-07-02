export interface RoomMember {
  uid: string;
  displayName: string;
  email?: string;
  photoURL: string;
  lat: number;
  lng: number;
  speed: number | null; // in meters per second
  heading: number | null; // in degrees
  accuracy: number | null; // in meters
  lastUpdated: any; // Firestore Timestamp or ISO string
}

export interface Room {
  code: string;
  creatorId: string;
  creatorName: string;
  createdAt: any;
}

export interface DistanceHistoryEntry {
  distance: number; // in meters
  timestamp: number; // Date.now() millisecond timestamp
}
