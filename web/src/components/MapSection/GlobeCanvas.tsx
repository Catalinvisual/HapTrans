'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';

const GEO_URL = '/world-110m.json';
const GEO_URL_FALLBACK = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type TopoShape = {
  objects: { countries: unknown };
};

const toFeatureCollection = (topo: TopoShape): FeatureCollection =>
  feature(topo as unknown as Parameters<typeof feature>[0], topo.objects.countries as Parameters<typeof feature>[1]) as unknown as FeatureCollection;

let worldCache: FeatureCollection | null = null;
const loadWorld = async (): Promise<FeatureCollection> => {
  if (worldCache) return worldCache;
  const res = await fetch(GEO_URL);
  const raw = res.ok ? await res.json() : null;
  if (raw) {
    worldCache = toFeatureCollection(raw as TopoShape);
    return worldCache;
  }
  const fallback = await fetch(GEO_URL_FALLBACK);
  if (!fallback.ok) throw new Error('world-atlas unavailable');
  const ftopo = (await fallback.json()) as TopoShape;
  worldCache = toFeatureCollection(ftopo);
  return worldCache;
};

const START_COORDS: Record<string, [number, number]> = {
  NL: [5.2913, 52.1326],
  RO: [24.9668, 45.9432],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  IT: [12.5674, 41.8719],
  BE: [4.4699, 50.5039],
  ES: [-3.7492, 40.4637],
  PL: [19.1451, 51.9194],
  AT: [14.5501, 47.5162],
  CZ: [15.4730, 49.8175],
  HU: [19.5033, 47.1625],
  SK: [19.6990, 48.6690],
  GB: [-3.4360, 55.3781],
  DK: [9.5018, 56.2639],
  CH: [8.2275, 46.8182],
  SE: [18.6435, 60.1282],
  NO: [8.4689, 60.4720],
  FI: [25.7482, 61.9241],
  PT: [-8.2245, 39.3999],
  GR: [21.8243, 39.0742],
  IE: [-8.2439, 53.4129],
  BG: [25.4858, 42.7339],
  HR: [15.2000, 45.1000],
  RS: [21.0059, 44.0165],
  SI: [14.9955, 46.1512],
};

const toEnglishName = (code: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

type Poly = { properties?: { name?: string } };
type PointD = { lat: number; lng: number; isHub?: boolean };
type LabelD = { text: string };
type ArcD = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

export default function GlobeCanvas({
  countries,
  className = '',
}: {
  countries: string[];
  className?: string;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#0e2a47',
        specular: new THREE.Color('#1e3a5f'),
        shininess: 12,
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    loadWorld()
      .then((w) => {
        if (!cancelled) setGeo(w);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error(err);
          setError('Harta nu a putut fi încărcată.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!geo) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minPolarAngle = Math.PI / 3.2;
    controls.maxPolarAngle = Math.PI / 1.75;
    globeRef.current?.pointOfView({ lat: 38, lng: 10, altitude: 2.3 }, 0);
  }, [geo]);

  const view = useMemo(() => {
    const targets = countries.filter((c) => c !== 'NL' && START_COORDS[c]);
    const allCodes = ['NL', ...targets];
    const arc: ArcD[] = targets.map((c) => ({
      startLat: START_COORDS['NL'][1],
      startLng: START_COORDS['NL'][0],
      endLat: START_COORDS[c][1],
      endLng: START_COORDS[c][0],
    }));
    const points: PointD[] = allCodes.map((c) => ({
      lat: START_COORDS[c][1],
      lng: START_COORDS[c][0],
      isHub: c === 'NL',
    }));
    const rings: PointD[] = points;
    const labels: LabelD[] = allCodes.map((c) => ({
      lat: START_COORDS[c][1],
      lng: START_COORDS[c][0],
      text: toEnglishName(c),
    }));
    const highlights = new Set(countries.map(toEnglishName));
    return { arc, points, rings, labels, highlights };
  }, [countries]);

  if (error) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: '320px' }}>{error}</p>
      </div>
    );
  }

  if (!geo) {
    return <div className={className} role="img" aria-label="Loading globe" />;
  }

  return (
    <div className={className} role="img" aria-label="Map of European destination countries">
<Globe
        ref={globeRef}
        rendererConfig={{ alpha: true, antialias: true }}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.22}
        showGraticules={false}
        polygonsData={geo.features}
        polygonCapColor={(d) =>
          view.highlights.has((d as Poly).properties?.name ?? '')
            ? '#FF5A00'
            : '#1c4163'
        }
        polygonSideColor={(d) =>
          view.highlights.has((d as Poly).properties?.name ?? '')
            ? 'rgba(255,90,0,0.85)'
            : '#2a5a80'
        }
        polygonStrokeColor={(d) =>
          view.highlights.has((d as Poly).properties?.name ?? '')
            ? 'rgba(255,255,255,0.6)'
            : 'rgba(148,197,233,0.22)'
        }
        polygonAltitude={() => 0.012}
        polygonsTransitionDuration={1000}
        arcsData={view.arc}
        arcColor={() => ['rgba(56,189,248,0.001)', '#38bdf8']}
        arcStroke={() => 0.7}
        arcDashLength={() => 0.5}
        arcDashGap={() => 0.6}
        arcDashAnimateTime={() => 1800}
        arcAltitudeAutoScale={() => 0.55}
        arcsTransitionDuration={1500}
        pointsData={view.points}
        pointLat={(d) => (d as PointD).lat}
        pointLng={(d) => (d as PointD).lng}
        pointColor={(d) => ((d as PointD).isHub ? '#f8fafc' : '#FF5A00')}
        pointAltitude={() => 0.02}
        pointRadius={() => 0.24}
        ringsData={view.rings}
        ringLat={(d: object) => (d as PointD).lat}
        ringLng={(d: object) => (d as PointD).lng}
        ringColor={(d: object) => ((d as PointD).isHub ? '#f8fafc' : '#FF5A00')}
        ringMaxRadius={() => 3.4}
        ringPropagationSpeed={() => 1.4}
        ringRepeatPeriod={() => 1200}
        labelsData={view.labels}
        labelLat={(d) => (d as PointD).lat}
        labelLng={(d) => (d as PointD).lng}
        labelText={(d) => (d as LabelD).text}
        labelAltitude={() => 0.012}
        labelSize={() => 0.95}
        labelDotRadius={() => 0.4}
        labelColor={() => 'rgba(255,255,255,0.92)'}
      />
    </div>
  );
}