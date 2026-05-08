"use client";

import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "@/components/ui/LeafletMarkerFix";

type MapPreviewProps = {
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  title: string;
  subtitle?: string;
  height?: number;
};

export default function MapPreview({
  startLat,
  startLng,
  destLat,
  destLng,
  title,
  subtitle,
  height = 300,
}: MapPreviewProps) {
  const center: [number, number] = [
    (startLat + destLat) / 2,
    (startLng + destLng) / 2,
  ];

  const linePoints: [number, number][] = [
    [startLat, startLng],
    [destLat, destLng],
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

        <Polyline positions={linePoints} pathOptions={{ color: "#38bdf8", weight: 4 }} />

        <Marker position={[startLat, startLng]}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">Start Point</div>
              <div>Initial location</div>
            </div>
          </Popup>
        </Marker>

        <Marker position={[destLat, destLng]}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{title}</div>
              {subtitle ? <div>{subtitle}</div> : null}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}