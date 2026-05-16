"use client";

import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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

  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-700">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: `${height}px`, width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
          <Marker position={[currentLat, currentLng]}>
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
