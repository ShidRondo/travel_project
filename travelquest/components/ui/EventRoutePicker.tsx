"use client";

import { useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { Flag, MapPin } from "lucide-react";
import "@/components/ui/LeafletMarkerFix";

type MapPoint = {
  lat: number;
  lng: number;
};

type EventRoutePickerProps = {
  startPoint: MapPoint | null;
  destinationPoint: MapPoint | null;
  onStartChange: (point: MapPoint) => void;
  onDestinationChange: (point: MapPoint) => void;
};

function ClickHandler({
  mode,
  onStartChange,
  onDestinationChange,
}: {
  mode: "start" | "destination";
  onStartChange: (point: MapPoint) => void;
  onDestinationChange: (point: MapPoint) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };

      if (mode === "start") {
        onStartChange(point);
      } else {
        onDestinationChange(point);
      }
    },
  });

  return null;
}

function formatPoint(point: MapPoint | null) {
  if (!point) return "Not selected";
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export default function EventRoutePicker({
  startPoint,
  destinationPoint,
  onStartChange,
  onDestinationChange,
}: EventRoutePickerProps) {
  const [mode, setMode] = useState<"start" | "destination">("start");

  const center: [number, number] =
    startPoint !== null
      ? [startPoint.lat, startPoint.lng]
      : destinationPoint !== null
      ? [destinationPoint.lat, destinationPoint.lng]
      : [10.3157, 123.8854];

  const linePoints: [number, number][] =
    startPoint && destinationPoint
      ? [
          [startPoint.lat, startPoint.lng],
          [destinationPoint.lat, destinationPoint.lng],
        ]
      : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("start")}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            mode === "start"
              ? "border-sky-500/40 bg-sky-500/15"
              : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-sky-300" />
            <span className="text-sm font-semibold text-white">Set Initial Location</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{formatPoint(startPoint)}</p>
        </button>

        <button
          type="button"
          onClick={() => setMode("destination")}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            mode === "destination"
              ? "border-emerald-500/40 bg-emerald-500/15"
              : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-300" />
            <span className="text-sm font-semibold text-white">Set Destination</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{formatPoint(destinationPoint)}</p>
        </button>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-zinc-700">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: "340px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <ClickHandler
            mode={mode}
            onStartChange={onStartChange}
            onDestinationChange={onDestinationChange}
          />

          {startPoint ? <Marker position={[startPoint.lat, startPoint.lng]} /> : null}
          {destinationPoint ? (
            <Marker position={[destinationPoint.lat, destinationPoint.lng]} />
          ) : null}

          {linePoints.length === 2 ? (
            <Polyline positions={linePoints} pathOptions={{ color: "#38bdf8", weight: 4 }} />
          ) : null}
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm leading-6 text-zinc-200">
        Click the map while <span className="font-semibold text-white">{mode === "start" ? "Set Initial Location" : "Set Destination"}</span> is active.
        The route line appears once both markers are selected.
      </div>
    </div>
  );
}