import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "../adminApi";

type MapPoint = {
  lat: number;
  lng: number;
};

type OfficeLocationMapProps = {
  addressLabel: string;
  coordinates: Coordinates | null;
  manualLat: string;
  manualLng: string;
  onManualLocationChange: (lat: string, lng: string) => void;
};

const markerIcon = L.divIcon({
  className: "office-pin-icon",
  html: "<span></span>",
  iconAnchor: [15, 35],
  iconSize: [30, 38]
});

function parsePoint(latText: string, lngText: string): MapPoint | null {
  const normalizedLat = latText.trim().replace(",", ".");
  const normalizedLng = lngText.trim().replace(",", ".");
  if (!normalizedLat || !normalizedLng) return null;
  const lat = Number(normalizedLat);
  const lng = Number(normalizedLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function toLatLng(point: MapPoint): L.LatLngExpression {
  return [point.lat, point.lng];
}

function pointKey(point: MapPoint | null) {
  return point ? `${point.lat.toFixed(7)}:${point.lng.toFixed(7)}` : "none";
}

export function OfficeLocationMap({
  addressLabel,
  coordinates,
  manualLat,
  manualLng,
  onManualLocationChange
}: OfficeLocationMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const latestPointRef = useRef<MapPoint | null>(null);

  const manualPoint = useMemo(() => parsePoint(manualLat, manualLng), [manualLat, manualLng]);
  const backendPoint = coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null;
  const activePoint = manualPoint ?? backendPoint;
  const [draftPoint, setDraftPoint] = useState<MapPoint | null>(activePoint);
  const activePointKey = pointKey(activePoint);
  const hasPoint = Boolean(activePoint);

  function commitPoint(point: MapPoint) {
    const roundedPoint = {
      lat: Number(formatCoordinate(point.lat)),
      lng: Number(formatCoordinate(point.lng))
    };
    latestPointRef.current = roundedPoint;
    setDraftPoint(roundedPoint);
    markerRef.current?.setLatLng(toLatLng(roundedPoint));
    mapRef.current?.panTo(toLatLng(roundedPoint));
    onManualLocationChange(formatCoordinate(roundedPoint.lat), formatCoordinate(roundedPoint.lng));
  }

  useEffect(() => {
    latestPointRef.current = activePoint;
    setDraftPoint(activePoint);

    if (!activePoint || !mapRef.current || !markerRef.current) return;

    markerRef.current.setLatLng(toLatLng(activePoint));
    mapRef.current.setView(toLatLng(activePoint), manualPoint ? 18 : Math.max(mapRef.current.getZoom(), 16));
    window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
  }, [activePointKey, manualPoint]);

  useEffect(() => {
    if (!mapNodeRef.current || !activePoint || mapRef.current) return;

    const map = L.map(mapNodeRef.current, {
      attributionControl: true,
      scrollWheelZoom: false,
      zoomControl: true
    }).setView(toLatLng(activePoint), manualPoint ? 18 : 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker(toLatLng(activePoint), {
      draggable: true,
      icon: markerIcon,
      keyboard: true,
      title: "Localizacao confirmada"
    }).addTo(map);

    marker.on("dragend", () => {
      const next = marker.getLatLng();
      commitPoint({ lat: next.lat, lng: next.lng });
    });

    const handleMapClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest(".leaflet-control")) return;
      const next = map.mouseEventToLatLng(event);
      commitPoint({ lat: next.lat, lng: next.lng });
    };

    map.getContainer().addEventListener("click", handleMapClick);

    mapRef.current = map;
    markerRef.current = marker;
    latestPointRef.current = activePoint;
    setDraftPoint(activePoint);
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.getContainer().removeEventListener("click", handleMapClick);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [hasPoint]);

  const statusLabel =
    coordinates?.confidence === "high" && (coordinates.precision === "street" || coordinates.precision === "manual")
      ? "Validada"
      : coordinates
        ? "Aproximada"
        : "Pendente";

  return (
    <section className="office-map-card" aria-label="Confirmacao da localizacao do advogado">
      <div className="office-map-header">
        <div>
          <p className="eyebrow">Localizacao</p>
          <h3>Confirmar no mapa</h3>
        </div>
        <span className={`office-map-status ${statusLabel === "Validada" ? "validated" : ""}`}>{statusLabel}</span>
      </div>

      {activePoint ? (
        <div className="office-map-canvas" ref={mapNodeRef} />
      ) : (
        <div className="office-map-empty">Consulte o CEP para carregar o mapa.</div>
      )}

      <div className="office-map-actions">
        <small>{addressLabel || "Endereco operacional do advogado"}</small>
        <button
          className="secondary-action"
          disabled={!draftPoint}
          onClick={() => {
            const point = draftPoint ?? latestPointRef.current;
            if (point) commitPoint(point);
          }}
          type="button"
        >
          Usar ponto do pin
        </button>
      </div>
    </section>
  );
}
