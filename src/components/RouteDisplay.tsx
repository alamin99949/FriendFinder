import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

interface RouteDisplayProps {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  onRouteInfo: (info: { distanceMeters: number; durationMillis: number }) => void;
}

export default function RouteDisplay({ origin, destination, onRouteInfo }: RouteDisplayProps) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Clear any previous route polylines
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];

    // Compute route using modern Routes API wrapper
    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      fields: ["path", "distanceMeters", "durationMillis", "viewport"],
    })
      .then(({ routes }) => {
        if (routes && routes[0]) {
          const route = routes[0];
          
          // Render polylines on the map
          const newPolylines = route.createPolylines();
          newPolylines.forEach((p) => {
            p.setOptions({
              strokeColor: "#3b82f6", // tailwind blue-500
              strokeOpacity: 0.8,
              strokeWeight: 6,
            });
            p.setMap(map);
          });
          polylinesRef.current = newPolylines;

          // Fit bounds to show the entire route
          if (route.viewport) {
            map.fitBounds(route.viewport);
          }

          // Report route stats back to parent for UI display
          onRouteInfo({
            distanceMeters: route.distanceMeters || 0,
            durationMillis: Number(route.durationMillis) || 0,
          });
        }
      })
      .catch((err) => {
        console.error("Error computing route:", err);
      });

    // Cleanup on unmount or dependency change
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}
