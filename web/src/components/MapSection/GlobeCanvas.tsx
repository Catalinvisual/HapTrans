'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import styles from './MapSection.module.css';
import { useLanguage } from '@/context/LanguageContext';

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
  LT: [23.8813, 55.1694],
  LV: [24.6032, 56.8796],
  EE: [25.0136, 58.5953],
  LU: [6.1296, 49.8153],
  MT: [14.3754, 35.9375],
  CY: [33.1242, 35.1264],
  IS: [-19.0208, 64.9631],
  BA: [17.6791, 44.2125],
  MD: [28.3699, 47.4116],
  UA: [31.1656, 48.3794],
  TR: [35.2433, 38.9637],
  MK: [21.7453, 41.6086],
  ME: [19.3744, 42.7087],
  AL: [20.1683, 41.1533],
  LI: [9.5554, 47.1660],
  AD: [1.6016, 42.5462],
  MC: [7.4196, 43.7384],
  SM: [12.4578, 43.9424],
  VA: [12.4534, 41.9029],
};

const toEnglishName = (code: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

const GEO_NAME_ALIASES: Record<string, string> = {
  'United Kingdom': 'GB',
  'United States': 'US',
  'South Korea': 'KR',
  'North Korea': 'KP',
  'Dominican Rep.': 'DO',
  'Central African Rep.': 'CF',
  'Eq. Guinea': 'GQ',
  'eSwatini': 'SZ',
  'Bosnia and Herz.': 'BA',
  'Falkland Is.': 'FK',
  'Solomon Is.': 'SB',
  'Dem. Rep. Congo': 'CD',
  'Congo': 'CG',
  'Czech Rep.': 'CZ',
  'Czech Republic': 'CZ',
};

const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z]/g, '');

const geoNameMatchesCountry = (geoName: string, code: string): boolean => {
  const countryKey = GEO_NAME_ALIASES[geoName];
  if (countryKey) return countryKey === code;
  return normalizeName(geoName) === normalizeName(toEnglishName(code));
};

type Poly = { properties?: { name?: string } };
type PointD = { lat: number; lng: number; itemType: 'hub' | 'destination' };
type HtmlLabelD = { lat: number; lng: number; text: string; isHub: boolean };
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ width: rect.width, height: rect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        if (cancelled) return;
        setError(null);
        setGeo(w);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error(err);
          setGeo(null);
          setError('Harta nu a putut fi încărcată.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!geo || !dims) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;

    controls.autoRotate = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minPolarAngle = Math.PI / 4.5;
    controls.maxPolarAngle = Math.PI / 1.6;

    globeRef.current?.pointOfView({ lat: 42, lng: 10, altitude: 1.55 }, 0);
  }, [geo, dims]);

  const view = useMemo(() => {
    const targets = countries.filter((c) => c !== 'NL' && START_COORDS[c]);
    const allCodes = ['NL', ...targets];

    const highlights = new Set<string>();
    if (geo) {
      for (const feat of geo.features) {
        const name = (feat as Poly).properties?.name ?? '';
        if (allCodes.some((c) => geoNameMatchesCountry(name, c))) {
          highlights.add(name);
        }
      }
    }

    const arc: ArcD[] = targets.map((c) => ({
      startLat: START_COORDS['NL'][1],
      startLng: START_COORDS['NL'][0],
      endLat: START_COORDS[c][1],
      endLng: START_COORDS[c][0],
    }));
    const points: PointD[] = allCodes.map((c) => ({
      lat: START_COORDS[c][1],
      lng: START_COORDS[c][0],
      itemType: c === 'NL' ? 'hub' : 'destination',
    }));
    const htmlLabels = allCodes.map((c) => ({
      lat: START_COORDS[c][1],
      lng: START_COORDS[c][0],
      text: c,
      isHub: c === 'NL',
    }));
    return { arc, points, htmlLabels, highlights };
  }, [countries, geo]);

  if (error) {
    return (
      <div className={className}>
        <div className={styles.globeFallback}>
          <p>{t('mapError')}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => setAttempt((a) => a + 1)}
          >
            {t('mapRetry')}
          </button>
        </div>
      </div>
    );
  }

  const zoomBy = (factor: number) => {
    const current = globeRef.current?.pointOfView();
    if (!current) return;
    const altitude = current.altitude ?? 1.55;
    const next = Math.min(3, Math.max(0.5, altitude * factor));
    globeRef.current?.pointOfView({ ...current, altitude: next }, 0);
  };

  const getLabelElement = (d: HtmlLabelD): HTMLElement => {
    const el = document.createElement('div');
    el.textContent = d.text;
    el.style.cssText =
      'position:relative;transform:translate(-50%,-130%);' +
      'font-family:Arial,Helvetica,sans-serif;' +
      'font-size:10px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;' +
      'color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.7);' +
      'line-height:1;pointer-events:none;';
    if (d.isHub) {
      el.style.color = '#fff';
      el.style.textShadow = '0 0 3px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.7)';
    }
    return el;
  };

  if (!geo || !dims) {
    return (
      <div className={className} ref={wrapperRef}>
        <div className={styles.globeFallback}>
          <div className={styles.spinner} />
          <p>{t('mapLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} ref={wrapperRef} role="img" aria-label="Map of European destination countries">
<Globe
        ref={globeRef}
        width={dims.width}
        height={dims.height}
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
        polygonAltitude={() => 0.02}
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
        pointColor={(d) => ((d as PointD).itemType === 'hub' ? '#f8fafc' : '#FF5A00')}
        pointAltitude={() => 0.03}
        pointRadius={() => 0.4}
        htmlElementsData={view.htmlLabels}
        htmlLat={(d) => (d as HtmlLabelD).lat}
        htmlLng={(d) => (d as HtmlLabelD).lng}
        htmlAltitude={() => 0.02}
        htmlElement={(d) => getLabelElement(d as HtmlLabelD)}
      />
      <div className={styles.zoomControls}>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom in"
          onClick={() => zoomBy(0.8)}
        >
          +
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom out"
          onClick={() => zoomBy(1.25)}
        >
          −
        </button>
      </div>
    </div>
  );
}