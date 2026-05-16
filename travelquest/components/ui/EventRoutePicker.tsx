"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { Flag, MapPin } from "lucide-react";
import "@/components/ui/LeafletMarkerFix";

type MapPoint = {
  lat: number;
  lng: number;
  name?: string;
};

type EventRoutePickerProps = {
  startPoint: MapPoint | null;
  destinationPoint: MapPoint | null;
  onStartChange: (point: MapPoint) => void;
  onDestinationChange: (point: MapPoint) => void;
  onRouteDistanceChange?: (distanceKm: number | null) => void;
  geofenceRadiusMeters?: number;
};

type RouteStatus = "idle" | "loading" | "routed" | "fallback";

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
    async click(e: LeafletMouseEvent) {
      const point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: "Looking up location...",
      };

      if (mode === "start") {
        onStartChange(point);
      } else {
        onDestinationChange(point);
      }

      const name = await getLocationName(point.lat, point.lng);
      const namedPoint = { ...point, name };

      if (mode === "start") {
        onStartChange(namedPoint);
      } else {
        onDestinationChange(namedPoint);
      }
    },
  });

  return null;
}

function formatPoint(point: MapPoint | null) {
  if (!point) return "Choose a point";
  return point.name?.trim() || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

async function getLocationName(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error("Unable to resolve location name");
    }

    const data = (await response.json()) as { display_name?: string };
    return data.display_name || "Unnamed pinned location";
  } catch {
    return "Unnamed pinned location";
  }
}

async function getRoutePath(
  startPoint: MapPoint,
  destinationPoint: MapPoint,
  signal: AbortSignal
) {
  const coordinates = `${startPoint.lng},${startPoint.lat};${destinationPoint.lng},${destinationPoint.lat}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Unable to resolve route path");
  }

  const data = (await response.json()) as {
    routes?: Array<{
      distance?: number;
      geometry?: {
        coordinates?: Array<[number, number]>;
      };
    }>;
  };
  const path = data.routes?.[0]?.geometry?.coordinates;

  if (!path || path.length < 2) {
    throw new Error("Route path is empty");
  }

  return {
    distanceKm: (data.routes?.[0]?.distance || 0) / 1000,
    path: path.map(([lng, lat]) => [lat, lng] as [number, number]),
  };
}

function getDirectDistanceKm(startPoint: MapPoint, destinationPoint: MapPoint) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDistance = toRadians(destinationPoint.lat - startPoint.lat);
  const lngDistance = toRadians(destinationPoint.lng - startPoint.lng);
  const startLat = toRadians(startPoint.lat);
  const destinationLat = toRadians(destinationPoint.lat);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(startLat) *
      Math.cos(destinationLat) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return "Choose a route";
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

export default function EventRoutePicker({
  startPoint,
  destinationPoint,
  onStartChange,
  onDestinationChange,
  onRouteDistanceChange,
  geofenceRadiusMeters = 180,
}: EventRoutePickerProps) {
  const [mode, setMode] = useState<"start" | "destination">("start");
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("idle");
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const startLat = startPoint?.lat;
  const startLng = startPoint?.lng;
  const destinationLat = destinationPoint?.lat;
  const destinationLng = destinationPoint?.lng;

  const center: [number, number] =
    startPoint !== null
      ? [startPoint.lat, startPoint.lng]
      : destinationPoint !== null
      ? [destinationPoint.lat, destinationPoint.lng]
      : [10.3157, 123.8854];

  useEffect(() => {
    if (
      startLat === undefined ||
      startLng === undefined ||
      destinationLat === undefined ||
      destinationLng === undefined
    ) {
      return;
    }

    const controller = new AbortController();

    const routeStart = { lat: startLat, lng: startLng };
    const routeDestination = { lat: destinationLat, lng: destinationLng };

    getRoutePath(routeStart, routeDestination, controller.signal)
      .then(({ path, distanceKm }) => {
        setRoutePath(path);
        setRouteDistanceKm(distanceKm);
        onRouteDistanceChange?.(distanceKm);
        setRouteStatus("routed");
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;

        const distanceKm = getDirectDistanceKm(routeStart, routeDestination);
        setRoutePath([
          [startLat, startLng],
          [destinationLat, destinationLng],
        ]);
        setRouteDistanceKm(distanceKm);
        onRouteDistanceChange?.(distanceKm);
        setRouteStatus("fallback");
      });

    return () => controller.abort();
  }, [startLat, startLng, destinationLat, destinationLng, onRouteDistanceChange]);

  const displayedRoutePath = startPoint && destinationPoint ? routePath : [];
  const displayedRouteStatus: RouteStatus =
    startPoint && destinationPoint
      ? routePath.length >= 2
        ? routeStatus
        : "loading"
      : "idle";
  const displayedDistance = startPoint && destinationPoint ? routeDistanceKm : null;

  const updatePointName = (
    point: MapPoint | null,
    name: string,
    onChange: (point: MapPoint) => void
  ) => {
    if (!point) return;
    onChange({ ...point, name });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            mode === "start"
              ? "border-sky-500/40 bg-sky-500/15"
              : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          <button
            type="button"
            onClick={() => setMode("start")}
            className="w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-sky-300" />
              <span className="text-sm font-semibold text-white">Set Initial Location</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{formatPoint(startPoint)}</p>
          </button>
          <input
            value={startPoint?.name || ""}
            onChange={(e) =>
              updatePointName(startPoint, e.target.value, onStartChange)
            }
            placeholder="Initial location name"
            disabled={!startPoint}
            className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-60"
          />
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            mode === "destination"
              ? "border-emerald-500/40 bg-emerald-500/15"
              : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          <button
            type="button"
            onClick={() => setMode("destination")}
            className="w-full text-left"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-semibold text-white">Set Destination</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{formatPoint(destinationPoint)}</p>
          </button>
          <input
            value={destinationPoint?.name || ""}
            onChange={(e) =>
              updatePointName(
                destinationPoint,
                e.target.value,
                onDestinationChange
              )
            }
            placeholder="Destination location name"
            disabled={!destinationPoint}
            className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-60"
          />
        </div>
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

          {startPoint ? (
            <Circle
              center={[startPoint.lat, startPoint.lng]}
              radius={geofenceRadiusMeters}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: 0.13,
                weight: 2,
              }}
            />
          ) : null}

          {destinationPoint ? (
            <Circle
              center={[destinationPoint.lat, destinationPoint.lng]}
              radius={geofenceRadiusMeters}
              pathOptions={{
                color: "#34d399",
                fillColor: "#34d399",
                fillOpacity: 0.13,
                weight: 2,
              }}
            />
          ) : null}

          {startPoint ? (
            <Marker position={[startPoint.lat, startPoint.lng]}>
              <Popup>{formatPoint(startPoint)}</Popup>
            </Marker>
          ) : null}
          {destinationPoint ? (
            <Marker position={[destinationPoint.lat, destinationPoint.lng]}>
              <Popup>{formatPoint(destinationPoint)}</Popup>
            </Marker>
          ) : null}

          {displayedRoutePath.length >= 2 ? (
            <Polyline positions={displayedRoutePath} pathOptions={{ color: "#38bdf8", weight: 4 }} />
          ) : null}
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm leading-6 text-zinc-200">
        Click the map while <span className="font-semibold text-white">{mode === "start" ? "Set Initial Location" : "Set Destination"}</span> is active.
        {displayedRouteStatus === "loading"
          ? " Finding a path between both markers."
          : displayedRouteStatus === "routed"
          ? ` The route follows the mapped path between both markers. Distance: ${formatDistance(displayedDistance)}.`
          : displayedRouteStatus === "fallback"
          ? ` A direct fallback line is shown because no mapped route was found. Distance: ${formatDistance(displayedDistance)}.`
          : " The route appears once both markers are selected."}
      </div>
    </div>
  );
}
