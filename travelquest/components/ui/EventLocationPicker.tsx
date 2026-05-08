"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import "@/components/ui/LeafletMarkerFix";

type EventLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
};

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function EventLocationPicker({
  lat,
  lng,
  onPick,
}: EventLocationPickerProps) {
  const center: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : [10.3157, 123.8854];

  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-700">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "320px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onPick} />
        {lat !== null && lng !== null ? <Marker position={[lat, lng]} /> : null}
      </MapContainer>
    </div>
  );
}