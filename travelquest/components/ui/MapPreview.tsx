"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "@/components/ui/LeafletMarkerFix";

type MapPreviewProps = {
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  title: string;
  subtitle?: string;
  height?: number;
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadiusMeters?: number;
  geofenceLabel?: string;
  destinationGeofenceLat?: number;
  destinationGeofenceLng?: number;
  destinationGeofenceRadiusMeters?: number;
  destinationGeofenceLabel?: string;
  currentLat?: number;
  currentLng?: number;
};

const currentLocationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: #22c55e;
      border: 3px solid white;
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.22), 0 10px 24px rgba(0,0,0,0.35);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

function FitMapToVisiblePoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 14));
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [map, points]);

  return null;
}

export default function MapPreview({
  startLat,
  startLng,
  destLat,
  destLng,
  title,
  subtitle,
  height = 300,
  geofenceLat,
  geofenceLng,
  geofenceRadiusMeters,
  geofenceLabel = "Initial geofence",
  destinationGeofenceLat,
  destinationGeofenceLng,
  destinationGeofenceRadiusMeters,
  destinationGeofenceLabel = "Destination geofence",
  currentLat,
  currentLng,
}: MapPreviewProps) {
  const center: [number, number] =
    geofenceLat !== undefined && geofenceLng !== undefined
      ? [geofenceLat, geofenceLng]
      : [destLat, destLng];
  const showStartMarker = startLat !== destLat || startLng !== destLng;
  const showGeofence =
    geofenceLat !== undefined &&
    geofenceLng !== undefined &&
    geofenceRadiusMeters !== undefined;
  const showDestinationGeofence =
    destinationGeofenceLat !== undefined &&
    destinationGeofenceLng !== undefined &&
    destinationGeofenceRadiusMeters !== undefined;
  const showCurrent = currentLat !== undefined && currentLng !== undefined;
  const visiblePoints = [
    [destLat, destLng] as [number, number],
    ...(showStartMarker ? [[startLat, startLng] as [number, number]] : []),
    ...(showCurrent ? [[currentLat, currentLng] as [number, number]] : []),
  ];

  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-700">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: `${height}px`, width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitMapToVisiblePoints points={visiblePoints} />

        {showGeofence ? (
          <Circle
            center={[geofenceLat, geofenceLng]}
            radius={geofenceRadiusMeters}
            pathOptions={{
              color: "#38bdf8",
              fillColor: "#38bdf8",
              fillOpacity: 0.14,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{geofenceLabel}</div>
                <div>{Math.round(geofenceRadiusMeters)} m radius</div>
              </div>
            </Popup>
          </Circle>
        ) : null}

        {showDestinationGeofence ? (
          <Circle
            center={[destinationGeofenceLat, destinationGeofenceLng]}
            radius={destinationGeofenceRadiusMeters}
            pathOptions={{
              color: "#34d399",
              fillColor: "#34d399",
              fillOpacity: 0.14,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{destinationGeofenceLabel}</div>
                <div>{Math.round(destinationGeofenceRadiusMeters)} m radius</div>
              </div>
            </Popup>
          </Circle>
        ) : null}

        {showStartMarker ? (
          <Marker position={[startLat, startLng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Initial location</div>
              </div>
            </Popup>
          </Marker>
        ) : null}

        <Marker position={[destLat, destLng]}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{title}</div>
              {subtitle ? <div>{subtitle}</div> : null}
            </div>
          </Popup>
        </Marker>

        {showCurrent ? (
          <Marker position={[currentLat, currentLng]} icon={currentLocationIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Your current GPS</div>
              </div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
