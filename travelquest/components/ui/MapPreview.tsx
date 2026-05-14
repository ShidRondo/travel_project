"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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
  destLat,
  destLng,
  title,
  subtitle,
  height = 300,
}: MapPreviewProps) {
  const center: [number, number] = [destLat, destLng];

  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-700">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: `${height}px`, width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
