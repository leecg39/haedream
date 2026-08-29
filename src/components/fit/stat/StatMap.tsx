"use client";

import { useEffect, useRef, useState } from "react";
import type { DivIcon, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { StatFirm } from "@/lib/fit-mocks/stat";

interface StatMapProps {
  readonly firms: readonly StatFirm[];
  readonly selectedFid: number | null;
  readonly onSelect: (fid: number) => void;
}

type MarkerEntry = { marker: LeafletMarker; firm: StatFirm };

const KOREA_COORDINATES: readonly [number, number][] = [
  [37.5665, 126.978], [37.4563, 126.7052], [37.2636, 127.0286], [37.3219, 126.8309],
  [37.1995, 126.8312], [37.3943, 126.9568], [37.4138, 126.678], [37.7599, 128.895],
  [37.3422, 127.9202], [36.9921, 127.1129], [36.8151, 127.1139], [36.4801, 127.289],
  [36.3504, 127.3845], [36.6424, 127.489], [36.991, 127.926], [36.1195, 128.3446],
  [35.8714, 128.6014], [35.8562, 129.2247], [36.019, 129.3435], [35.5384, 129.3114],
  [35.228, 128.6811], [35.9676, 126.7369], [35.8242, 127.148], [35.9483, 126.9576],
  [35.1595, 126.8526], [35.0161, 126.7108], [34.7604, 127.6622], [34.9407, 127.6959],
  [35.1802, 128.1076], [35.234, 128.119], [35.5038, 128.746], [35.2724, 128.4065],
  [35.2285, 128.8894], [35.1796, 129.0756], [37.8854, 127.7298], [37.7519, 128.8761],
  [37.8228, 128.1555], [38.207, 128.5918], [36.7898, 127.0018], [36.6014, 126.6608],
  [36.6802, 126.8448], [36.446, 127.119], [36.978, 127.928], [33.4996, 126.5312],
  [33.2541, 126.5601],
];

function markerColor(firm: StatFirm, index: number): string {
  if (firm.netError) return "#ff2e2e";
  if (firm.peak) return "#ff9f1a";
  return index % 4 === 0 ? "#76ff03" : "#ffff81";
}

function markerIcon(L: typeof import("leaflet"), firm: StatFirm, index: number, selected: boolean): DivIcon {
  const color = markerColor(firm, index);
  const size = selected ? 42 : 26;
  return L.divIcon({
    className: "statMapMarkerHost",
    html: `<span class="statMapMarker${selected ? " isSelected" : ""}" style="--marker-color:${color}" aria-hidden="true"><span></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function ambientMarkerIcon(L: typeof import("leaflet"), index: number): DivIcon {
  const colors = ["#76ff03", "#76ff03", "#76ff03", "#ffff81", "#76ff03", "#ff9f1a", "#76ff03"];
  return L.divIcon({
    className: "statMapMarkerHost ambient",
    html: `<span class="statMapMarker" style="--marker-color:${colors[index % colors.length]}" aria-hidden="true"><span></span></span>`,
    iconSize: [22, 26],
    iconAnchor: [11, 26],
  });
}

function ambientCoordinate(index: number): [number, number] {
  const base = KOREA_COORDINATES[index % KOREA_COORDINATES.length];
  const band = Math.floor(index / KOREA_COORDINATES.length) + 1;
  const latOffset = Math.sin(index * 12.9898) * (0.035 + band * 0.018);
  const lngOffset = Math.cos(index * 7.233) * (0.045 + band * 0.024);
  return [base[0] + latOffset, base[1] + lngOffset];
}

/**
 * API 키 없이 localhost에서도 동작하는 실제 Leaflet 지도.
 * Esri World Imagery 위성 타일 위에 경계/지명 레이어를 겹쳐 참조 영상의 지형 표현을 맞춘다.
 */
export function StatMap({ firms, selectedFid, onSelect }: StatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<number, MarkerEntry>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    const markerEntries = markersRef.current;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [36.25, 127.75],
        zoom: 7,
        minZoom: 6,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: true,
      });
      mapRef.current = map;
      const updateZoomState = () => {
        containerRef.current?.parentElement?.setAttribute("data-map-zoom", String(map.getZoom()));
      };
      updateZoomState();
      map.on("zoomend", updateZoomState);
      map.on("moveend", () => {
        const host = containerRef.current?.parentElement;
        if (host) {
          host.setAttribute("data-map-moved", String(Number(host.getAttribute("data-map-moved") ?? 0) + 1));
        }
      });
      L.control.zoom({ position: "bottomleft" }).addTo(map);

      const imagery = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          attribution: "Tiles © Esri",
          crossOrigin: true,
        },
      );
      imagery.on("load", () => setMapState("ready"));
      imagery.on("tileerror", () => setMapState((current) => current === "ready" ? current : "error"));
      imagery.addTo(map);

      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, attribution: "Labels © Esri" },
      ).addTo(map);

      if (firms.length > 0) {
        for (let index = 0; index < 315; index += 1) {
          const firm = firms[index % firms.length];
          const marker = L.marker(ambientCoordinate(index), {
            icon: ambientMarkerIcon(L, index),
            interactive: true,
            keyboard: true,
            title: `${firm.firmName} 관측 지점`,
            riseOnHover: true,
            zIndexOffset: -20,
          }).addTo(map);
          marker.on("click", () => onSelectRef.current(firm.fid));
        }
      }

      firms.forEach((firm, index) => {
        const position = KOREA_COORDINATES[index % KOREA_COORDINATES.length];
        const marker = L.marker(position, {
          icon: markerIcon(L, firm, index, false),
          keyboard: true,
          title: firm.firmName,
          riseOnHover: true,
        }).addTo(map);
        marker.on("click", () => onSelectRef.current(firm.fid));
        markerEntries.set(firm.fid, { marker, firm });
      });

      resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resizeObserver.observe(containerRef.current);
      window.setTimeout(() => map.invalidateSize({ pan: false }), 0);
    }).catch(() => setMapState("error"));

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      markerEntries.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [firms]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach(({ marker, firm }, fid) => {
      const index = firms.findIndex((item) => item.fid === fid);
      marker.setIcon(markerIcon(L, firm, index, fid === selectedFid));
      marker.setZIndexOffset(fid === selectedFid ? 1000 : 0);
    });

    if (selectedFid !== null) {
      const selected = markersRef.current.get(selectedFid);
      if (selected) map.flyTo(selected.marker.getLatLng(), Math.max(map.getZoom(), 9), { duration: 0.65 });
    }
  }, [firms, selectedFid]);

  return (
    <div className="map" id="map" data-map-state={mapState} aria-label="전국 참여 업체 지도">
      <div ref={containerRef} className="statMapCanvas" />
      {mapState !== "ready" ? (
        <div className={`mapLoadState ${mapState}`} role="status">
          {mapState === "error" ? "지도 타일을 불러오지 못했습니다." : "위성 지도를 불러오는 중입니다."}
        </div>
      ) : null}
    </div>
  );
}
