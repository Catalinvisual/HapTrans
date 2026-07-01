import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, Truck, Play, Pause, Square, Map as MapIcon, Layers, Search } from 'lucide-react';
import api from '../lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

declare global { interface Window { maplibregl: any; } }

const TRUCK_TRANSLATIONS: Record<string, string> = {
  ro: 'Camion',
  en: 'Truck',
  nl: 'Vrachtwagen',
  de: 'LKW',
  fr: 'Camion'
};

const DRIVER_TRANSLATIONS: Record<string, string> = {
  ro: 'Șofer',
  en: 'Driver',
  nl: 'Chauffeur',
  de: 'Fahrer',
  fr: 'Chauffeur'
};

const ETA_TRANSLATIONS: Record<string, any> = {
  ro: { pickup: 'Încărcare', dropoff: 'Descărcare', arrivesAt: 'Sosește la:', liveEta: 'Live ETA • include', breaks: 'pauze', today: 'Azi', tomorrow: 'Mâine', calcRoute: 'Calculăm ruta în timp real...', errRoute: 'Eroare rută:', errNoCoords: 'Nu s-au returnat coordonate', errUnknown: 'Necunoscută' },
  en: { pickup: 'Pickup', dropoff: 'Dropoff', arrivesAt: 'Arrives at:', liveEta: 'Live ETA • includes', breaks: 'breaks', today: 'Today', tomorrow: 'Tomorrow', calcRoute: 'Calculating live route...', errRoute: 'Route error:', errNoCoords: 'No coordinates returned', errUnknown: 'Unknown' },
  nl: { pickup: 'Ophalen', dropoff: 'Afleveren', arrivesAt: 'Komt aan om:', liveEta: 'Live ETA • incl.', breaks: 'pauzes', today: 'Vandaag', tomorrow: 'Morgen', calcRoute: 'Live route berekenen...', errRoute: 'Routefout:', errNoCoords: 'Geen coördinaten geretourneerd', errUnknown: 'Onbekend' },
  de: { pickup: 'Abholung', dropoff: 'Lieferung', arrivesAt: 'Ankunft um:', liveEta: 'Live ETA • inkl.', breaks: 'Pausen', today: 'Heute', tomorrow: 'Morgen', calcRoute: 'Live-Route berechnen...', errRoute: 'Routenfehler:', errNoCoords: 'Keine Koordinaten zurückgegeben', errUnknown: 'Unbekannt' },
  fr: { pickup: 'Chargement', dropoff: 'Déchargement', arrivesAt: 'Arrive à:', liveEta: 'Live ETA • incl.', breaks: 'pauses', today: "Aujourd'hui", tomorrow: 'Demain', calcRoute: 'Calcul de l\'itinéraire en direct...', errRoute: 'Erreur d\'itinéraire:', errNoCoords: 'Aucune coordonnée retournée', errUnknown: 'Inconnue' }
};

// Helper for distance calculation (Haversine formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
};

// Find the closest point on segment AB to point P
const getClosestPointOnSegment = (p: [number, number], a: [number, number], b: [number, number]) => {
  const ax = a[0], ay = a[1];
  const bx = b[0], by = b[1];
  const px = p[0], py = p[1];
  
  const dx = bx - ax;
  const dy = by - ay;
  
  if (dx === 0 && dy === 0) {
    return { point: a, t: 0 };
  }
  
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  
  return {
    point: [ax + t * dx, ay + t * dy] as [number, number],
    t: t
  };
};

// Find the closest point on the route polyline to point P
const findClosestPointOnRoute = (p: [number, number], route: [number, number][]) => {
  if (!route || route.length === 0) return null;
  if (route.length === 1) {
    const dist = getDistance(p[1], p[0], route[0][1], route[0][0]);
    return { point: route[0], index: 0, t: 0, distance: dist };
  }
  
  let minDistance = Infinity;
  let closestPoint = route[0];
  let closestIndex = 0;
  let closestT = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    const { point, t } = getClosestPointOnSegment(p, route[i], route[i+1]);
    const dist = getDistance(p[1], p[0], point[1], point[0]);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = point;
      closestIndex = i;
      closestT = t;
    }
  }
  
  return { point: closestPoint, index: closestIndex, t: closestT, distance: minDistance };
};

// Construct the sub-polyline from start snap to end snap along the route
const getSubPolyline = (route: [number, number][], startSnap: any, endSnap: any): [number, number][] => {
  if (startSnap.index === endSnap.index) {
    return [startSnap.point, endSnap.point];
  }
  if (startSnap.index < endSnap.index) {
    return [
      startSnap.point,
      ...route.slice(startSnap.index + 1, endSnap.index + 1),
      endSnap.point
    ];
  } else {
    const sub = route.slice(endSnap.index + 1, startSnap.index + 1);
    return [
      startSnap.point,
      ...[...sub].reverse(),
      endSnap.point
    ];
  }
};

// Pre-calculate polyline lengths
const getPolylineLengthAndSegments = (polyline: [number, number][]) => {
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = getDistance(polyline[i][1], polyline[i][0], polyline[i+1][1], polyline[i+1][0]);
    segmentLengths.push(dist);
    totalLength += dist;
  }
  return { totalLength, segmentLengths };
};

// Find the point at a specific distance along the polyline
const getPointAtLength = (
  polyline: [number, number][],
  targetDist: number,
  totalLength: number,
  segmentLengths: number[]
): [number, number] => {
  if (polyline.length === 0) return [0, 0];
  if (polyline.length === 1 || targetDist <= 0) return polyline[0];
  if (targetDist >= totalLength) return polyline[polyline.length - 1];
  
  let accumulated = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist) {
      const remaining = targetDist - accumulated;
      const t = segLen === 0 ? 0 : remaining / segLen;
      const a = polyline[i];
      const b = polyline[i+1];
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t
      ];
    }
    accumulated += segLen;
  }
  return polyline[polyline.length - 1];
};

export default function LiveMapPage() {
  const { t, i18n } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSatellite, setIsSatellite] = useState(false);

  // Refs to avoid stale closures in the WebSocket listener
  const tripsRef = useRef<any[]>([]);
  const trucksStateRef = useRef<any[]>([]);
  const driversStateRef = useRef<any[]>([]);
  const focusedTruckRef = useRef<any>(null);
  const lastRouteCalcRef = useRef<Record<string, { lat: number; lng: number; time: number }>>({});
  const activeRoutesRef = useRef<Record<string, [number, number][]>>({});
  const animationFramesRef = useRef<Record<string, number>>({});
  const lastUpdateTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(link);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markersRef.current = {};
      Object.values(animationFramesRef.current).forEach(cancelAnimationFrame);
      animationFramesRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    const style = isSatellite 
      ? {
          "version": 8,
          "sources": {
            "esri-satellite": {
              "type": "raster",
              "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              "tileSize": 256,
              "attribution": "Esri",
              "maxzoom": 19
            },
            "esri-labels": {
              "type": "raster",
              "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
              "tileSize": 256,
              "maxzoom": 19
            }
          },
          "layers": [
            {
              "id": "satellite",
              "type": "raster",
              "source": "esri-satellite"
            },
            {
              "id": "labels",
              "type": "raster",
              "source": "esri-labels"
            }
          ]
        }
      : 'https://tiles.openfreemap.org/styles/bright';
      
    mapInstance.current.setStyle(style);
    
    // Re-draw route layer if we had a focused truck, since changing style clears custom layers
    mapInstance.current.once('styledata', () => {
      if (focusedTruckRef.current) {
        drawRoute(focusedTruckRef.current, true);
      }
    });
  }, [isSatellite]);

  const initMap = () => {
    if (!mapRef.current || !window.maplibregl) return;
    mapInstance.current = new window.maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [5.2913, 52.1326], 
      zoom: 8,
      pitch: 45, // Set pitch for 3D effect
      attributionControl: false, // Remove MapLibre logo/attribution to clean up UI
    });

    // Add 3D buildings layer
    mapInstance.current.on('load', () => {
      try {
        const layers = mapInstance.current.getStyle().layers;
        const labelLayerId = layers.find((l: any) => l.type === 'symbol' && l.layout['text-field'])?.id;
        
        mapInstance.current.addLayer({
          'id': '3d-buildings',
          'source': 'openmaptiles',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 14, // Buildings appear when zoomed in
          'paint': {
            'fill-extrusion-color': '#d4d4d8',
            'fill-extrusion-height': ['get', 'render_height'],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.8
          }
        }, labelLayerId);
      } catch (e) {
        // Fallback silențios
      }
    });

    // Add basic navigation controls without pitch
    mapInstance.current.addControl(new window.maplibregl.NavigationControl({
      showCompass: true,
      visualizePitch: true,
    }), 'top-right');
    
    // mapInstance.current.addControl(new window.maplibregl.AttributionControl({
    //   customAttribution: '© OpenStreetMap contributors',
    //   compact: true,
    // }), 'bottom-right');
    loadLocations();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    let foundTruck = trucks.find(t => t.plateNumber?.toLowerCase().includes(query));

    if (!foundTruck) {
      const foundTrip = tripsList.find(t => {
        if (t.status !== 'in_progress' && t.status !== 'confirmed') return false;
        const ref = t.referenceNumber?.toLowerCase() || '';
        const pickupCity = t.pickup?.city?.toLowerCase() || '';
        const dropoffCity = t.dropoff?.city?.toLowerCase() || '';
        return ref.includes(query) || pickupCity.includes(query) || dropoffCity.includes(query);
      });
      if (foundTrip && foundTrip.truck) {
        foundTruck = trucks.find(tr => tr.id === foundTrip.truck.id) || foundTrip.truck;
      }
    }

    if (foundTruck) {
      focusOnTruck(foundTruck);
      drawRoute(foundTruck);
      toast.success(t('truckFound') || 'Camion găsit pe hartă.');
    } else {
      toast.error(t('notFound') || 'Nu s-a găsit niciun rezultat.');
    }
  };

  const loadLocations = async () => {
    try {
      const [dr, tr, tripsRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/trucks'),
        api.get('/trips')
      ]);
      setDrivers(dr.data); setTrucks(tr.data); setTripsList(tripsRes.data);
      driversStateRef.current = dr.data;
      trucksStateRef.current = tr.data;
      tripsRef.current = tripsRes.data;
      
      const activeTruckDrivers: Record<string, string> = {};
      const activeDriverTrucks: Record<string, any> = {};
      tripsRes.data.forEach((trip: any) => {
        if ((trip.status === 'in_progress' || trip.status === 'confirmed') && trip.truck && trip.driver) {
          activeTruckDrivers[trip.truck.id] = trip.driver.user?.name || 'Șofer';
          activeDriverTrucks[trip.driver.id] = trip.truck;
        }
      });

      const lang = i18n.language || 'ro';
      const truckWord = TRUCK_TRANSLATIONS[lang] || TRUCK_TRANSLATIONS['ro'];

      const plottedDriverIds = new Set<string>();

      // Plot trucks with coordinates
      tr.data.forEach((t: any) => {
        let lat = t.currentLat;
        let lng = t.currentLng;
        const driverName = activeTruckDrivers[t.id] || t.driver?.user?.name || 'Șofer';

        // Check if there is an active driver for this truck who has precise coordinates
        const assignedDriver = dr.data.find((d: any) => 
          d.truck?.id === t.id || 
          (activeDriverTrucks[d.id] && activeDriverTrucks[d.id].id === t.id)
        );

        if (assignedDriver && assignedDriver.currentLat && assignedDriver.currentLng) {
          lat = assignedDriver.currentLat;
          lng = assignedDriver.currentLng;
        }

        if (lat && lng) {
          const label = t.plateNumber || 'Necunoscut';
          addMarker(t.id, parseFloat(lng), parseFloat(lat), label, driverName);
          if (assignedDriver) plottedDriverIds.add(assignedDriver.id);
        }
      });
    } catch (e) { console.error(e); }
  };

  const animateMarker = (
    truckId: string,
    marker: any,
    startGPS: [number, number],
    endGPS: [number, number],
    durationMs: number = 14500
  ) => {
    if (animationFramesRef.current[truckId]) {
      cancelAnimationFrame(animationFramesRef.current[truckId]);
    }

    const routeCoords = activeRoutesRef.current[truckId];
    let subPolyline: [number, number][] | null = null;
    let polyLengthInfo: { totalLength: number; segmentLengths: number[] } | null = null;

    if (routeCoords && routeCoords.length > 1) {
      const startSnap = findClosestPointOnRoute(startGPS, routeCoords);
      const endSnap = findClosestPointOnRoute(endGPS, routeCoords);

      const isStartSnapped = startSnap && startSnap.distance <= 150;
      const isEndSnapped = endSnap && endSnap.distance <= 150;

      if (isStartSnapped && isEndSnapped) {
        subPolyline = getSubPolyline(routeCoords, startSnap, endSnap);
        polyLengthInfo = getPolylineLengthAndSegments(subPolyline);
      }
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      let currentPos: [number, number];

      if (subPolyline && polyLengthInfo && polyLengthInfo.totalLength > 0) {
        const targetDist = progress * polyLengthInfo.totalLength;
        currentPos = getPointAtLength(subPolyline, targetDist, polyLengthInfo.totalLength, polyLengthInfo.segmentLengths);
      } else {
        const lng = startGPS[0] + (endGPS[0] - startGPS[0]) * progress;
        const lat = startGPS[1] + (endGPS[1] - startGPS[1]) * progress;
        currentPos = [lng, lat];
      }

      marker.setLngLat(currentPos);

      // Trim route line dynamically if this is the focused truck
      if (focusedTruckRef.current && focusedTruckRef.current.id === truckId && routeCoords) {
        updateTrimmedRouteLine(truckId, currentPos, routeCoords);
      }

      if (progress < 1) {
        animationFramesRef.current[truckId] = requestAnimationFrame(step);
      } else {
        delete animationFramesRef.current[truckId];
      }
    };

    animationFramesRef.current[truckId] = requestAnimationFrame(step);
  };

  const updateTrimmedRouteLine = (truckId: string, currentPos: [number, number], routeCoords: [number, number][]) => {
    if (!mapInstance.current) return;
    const snap = findClosestPointOnRoute(currentPos, routeCoords);
    if (!snap) return;
    
    const remainingCoords = [
      snap.point,
      ...routeCoords.slice(snap.index + 1)
    ];
    
    const sourceId = 'route-source';
    try {
      const source = mapInstance.current.getSource(sourceId);
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: remainingCoords
          },
          properties: {}
        });
      }
    } catch (e) {
      console.warn('Error updating route line data', e);
    }
  };

  const addMarker = (id: string, lng: number, lat: number, label: string, popupText: string, isTruck: boolean = true) => {
    if (!mapInstance.current || !window.maplibregl) return;
    
    const existingMarker = markersRef.current[id];
    if (existingMarker) {
      const startLngLat = existingMarker.getLngLat();
      animateMarker(id, existingMarker, [startLngLat.lng, startLngLat.lat], [lng, lat], 1500);
      
      const el = existingMarker.getElement();
      if (el) {
        const labelEl = el.querySelector('.marker-label');
        if (labelEl) {
          labelEl.innerHTML = isTruck ? `<span style="color:#FF7A1A">🚚</span> ${label}` : `👤 ${label}`;
        }
      }
      
      const popup = existingMarker.getPopup();
      if (popup) {
        const lang = i18n.language || 'ro';
        const driverWord = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS['ro'];
        const subtextHtml = (label !== popupText && popupText) ? 
          `<div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:4px">
             <span style="font-weight:bold;color:#FF7A1A">${driverWord}:</span> ${popupText}
           </div>` : '';
           
        popup.setHTML(`
          <div style="font-family:sans-serif;padding:6px 8px;min-width:140px">
            <div style="font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:4px;border-bottom:1px solid #E2E8F0;padding-bottom:4px">${label}</div>
            ${subtextHtml}
          </div>
        `);
      }
      return;
    }

    const color = '#FF7A1A'; 
    const svgIcon = isTruck
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:white;margin:auto"><path d="M14 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10"/><path d="M14 2v16"/><path d="M14 10h5l3 3v3h-8"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:white;margin:auto"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    const lang = i18n.language || 'ro';
    const driverWord = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS['ro'];

    const el = document.createElement('div');
    el.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer`;
    el.innerHTML = `
      <div class="marker-label" style="background:#0F172A;color:#FFFFFF;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.3);margin-bottom:6px;border:1.5px solid #FF7A1A;display:flex;align-items:center;gap:6px">
        ${isTruck ? '<span style="color:#FF7A1A">🚚</span>' : '👤'} ${label}
      </div>
      <div style="width:38px;height:38px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 0 15px rgba(255,122,26,0.6)">
        ${svgIcon}
      </div>
    `;

    el.addEventListener('click', (e) => {
      let truck = trucksStateRef.current.find((t: any) => t.id === id);
      if (!truck) {
        const drv = driversStateRef.current.find((d: any) => d.id === id);
        if (drv && drv.truck) {
          truck = trucksStateRef.current.find((t: any) => t.id === drv.truck.id) || drv.truck;
        }
      }
      if (!truck) {
        const plateStr = label.match(/\((.*?)\)/)?.[1];
        if (plateStr) truck = trucksStateRef.current.find((t: any) => t.plateNumber === plateStr);
      }
      if (truck) {
        focusedTruckRef.current = truck;
        drawRoute(truck);
      }
    }, true);

    const isPlaceholder = popupText === '?ofer' || popupText === 'Șofer';
    const subtextHtml = (label !== popupText && popupText && !isPlaceholder) ? 
      `<div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:4px">
         <span style="font-weight:bold;color:#FF7A1A">${driverWord}:</span> ${popupText}
       </div>` : '';

    const marker = new window.maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new window.maplibregl.Popup({ offset: 30 }).setHTML(`
        <div style="font-family:sans-serif;padding:6px 8px;min-width:140px">
          <div style="font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:4px;border-bottom:1px solid #E2E8F0;padding-bottom:4px">${label}</div>
          ${subtextHtml}
        </div>
      `))
      .addTo(mapInstance.current);
    markersRef.current[id] = marker;
  };

  const drawRoute = async (truck: any, preventFitBounds: boolean = false) => {
    if (!mapInstance.current) return;

    // Clear existing route layer and source, and destination popup
    const sourceId = 'route-source';
    const layerId = 'route-layer';
    if (mapInstance.current.getLayer(layerId)) mapInstance.current.removeLayer(layerId);
    if (mapInstance.current.getSource(sourceId)) mapInstance.current.removeSource(sourceId);
    if ((window as any).etaPopup) {
      (window as any).etaPopup.remove();
      (window as any).etaPopup = null;
    }

    // Find active trip for this truck
    const activeTrip = tripsRef.current.find((t: any) =>
      t.truck?.id === truck.id &&
      ['in_progress', 'confirmed', 'pending'].includes(t.status)
    );

    if (!activeTrip) {
      return;
    }

    const lang = i18n.language || 'ro';
    const etaLabels = ETA_TRANSLATIONS[lang] || ETA_TRANSLATIONS['en'];

    const isPending = ['pending', 'confirmed'].includes(activeTrip.status);
    const hasTruckGps = !!(truck.currentLat && truck.currentLng && parseFloat(truck.currentLat) !== 0 && parseFloat(truck.currentLng) !== 0);
    const destAddress = (isPending && hasTruckGps) ? activeTrip.pickupAddress : activeTrip.dropoffAddress;
    const destLabel = (isPending && hasTruckGps) ? etaLabels.pickup : etaLabels.dropoff;

    if (!destAddress) {
      return;
    }

    if (!hasTruckGps && (!activeTrip.pickupAddress || !activeTrip.dropoffAddress)) {
      return;
    }

    // Check throttle for real-time updates
    if (preventFitBounds && hasTruckGps) {
      const lastCalc = lastRouteCalcRef.current[truck.id];
      const now = Date.now();
      if (lastCalc) {
        const timeDiff = now - lastCalc.time;
        const dist = getDistance(
          parseFloat(truck.currentLat), 
          parseFloat(truck.currentLng), 
          lastCalc.lat, 
          lastCalc.lng
        );
        // Throttle: if they moved less than 400 meters AND it has been less than 45 seconds, skip recalculation
        if (dist < 400 && timeDiff < 45000) {
          const routeCoords = activeRoutesRef.current[truck.id];
          if (routeCoords) {
            const currentPos: [number, number] = [parseFloat(truck.currentLng), parseFloat(truck.currentLat)];
            updateTrimmedRouteLine(truck.id, currentPos, routeCoords);
          }
          return;
        }
      }
    }

    let loadToast = null;
    if (!preventFitBounds) {
      loadToast = toast.loading(etaLabels.calcRoute);
    }

    try {
      const payload: any = { destAddress };
      if (hasTruckGps) {
        payload.originLat = parseFloat(truck.currentLat);
        payload.originLng = parseFloat(truck.currentLng);
      } else {
        payload.originAddress = activeTrip.pickupAddress;
      }

      const res = await api.post('/routing/calculate', payload);
      const data = res.data;
      if (data.error) {
        throw new Error(`${data.error}`);
      }
      if (!data?.coordinates?.length) throw new Error(etaLabels.errNoCoords);

      // Save calculation info
      if (hasTruckGps) {
        lastRouteCalcRef.current[truck.id] = {
          lat: parseFloat(truck.currentLat),
          lng: parseFloat(truck.currentLng),
          time: Date.now()
        };
      }

      const coords = data.coordinates.map((c: number[]) => [c[0], c[1]]);
      activeRoutesRef.current[truck.id] = coords;

      let coordsToDraw = coords;
      if (hasTruckGps) {
        const truckPos: [number, number] = [parseFloat(truck.currentLng), parseFloat(truck.currentLat)];
        const snap = findClosestPointOnRoute(truckPos, coords);
        if (snap && snap.distance <= 150) {
          coordsToDraw = [snap.point, ...coords.slice(snap.index + 1)];
        }
      }

      mapInstance.current.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coordsToDraw }, properties: {} },
      });
      mapInstance.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FF7A1A', 'line-width': 5, 'line-opacity': 0.85, 'line-dasharray': [1, 0] },
      });

      // Fit map to route bounds safely
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (c[0] < minLng) minLng = c[0];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[1] > maxLat) maxLat = c[1];
      }
      
      if (minLng !== Infinity && !preventFitBounds) {
        mapInstance.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 60, duration: 1200 }
        );
      }

      // Smart ETA calculation (EU rules) and Live exact arrival time
      if (data.durationMin) {
        const drivingMinutesAllowed = 4.5 * 60;
        const breakMinutes = 45;
        const numberOfBreaks = Math.floor(data.durationMin / drivingMinutesAllowed);
        
        // Add 11 hours rest for every 9 hours of driving
        const nightRests = Math.floor(data.durationMin / (9 * 60));
        
        const totalMinutes = data.durationMin + (numberOfBreaks * breakMinutes) + (nightRests * 11 * 60);
        
        const arrivalDate = new Date(Date.now() + totalMinutes * 60 * 1000);
        const timeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const today = new Date();
        let dayStr = '';
        if (arrivalDate.getDate() === today.getDate() && arrivalDate.getMonth() === today.getMonth()) {
          dayStr = etaLabels.today;
        } else {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (arrivalDate.getDate() === tomorrow.getDate() && arrivalDate.getMonth() === tomorrow.getMonth()) {
            dayStr = etaLabels.tomorrow;
          } else {
            dayStr = arrivalDate.toLocaleDateString([], { day: '2-digit', month: 'short' });
          }
        }
        const exactETA = `${timeStr} (${dayStr})`;

        // Create or update a custom popup at the destination point
        const dest = coords[coords.length - 1];
        
        // Remove old ETA popup if exists
        if ((window as any).etaPopup) (window as any).etaPopup.remove();
        
        (window as any).etaPopup = new window.maplibregl.Popup({ closeOnClick: false, offset: 15 })
          .setLngLat(dest)
          .setHTML(`
            <div style="font-family:sans-serif;padding:6px;min-width:160px;text-align:center">
              <div style="font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;margin-bottom:2px">${destLabel}</div>
              <div style="font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:6px;white-space:normal;line-height:1.2">${destAddress}</div>
              <div style="background:#ECFDF5;border:1px solid #10B981;border-radius:6px;padding:6px;color:#047857;box-shadow:0 2px 6px rgba(16,185,129,0.2)">
                <div style="font-size:10px;font-weight:bold;margin-bottom:2px">⏰ ${etaLabels.arrivesAt}</div>
                <div style="font-size:15px;font-weight:900">${exactETA}</div>
                <div style="font-size:9px;opacity:0.8;margin-top:2px">${etaLabels.liveEta} ${numberOfBreaks} ${etaLabels.breaks}</div>
              </div>
            </div>
          `)
          .addTo(mapInstance.current);
      }
      if (loadToast) toast.dismiss(loadToast);
    } catch (err: any) {
      if (loadToast) toast.dismiss(loadToast);
      if (!preventFitBounds) {
        toast.error(`${etaLabels.errRoute} ${err.message || etaLabels.errUnknown}`);
      }
      console.error(err);
    }
  };

  const focusOnTruck = (truck: any) => {
    focusedTruckRef.current = truck;
    let lat = truck.currentLat;
    let lng = truck.currentLng;

    // 1. Try to get marker directly by truck id
    let markerId = truck.id;
    let marker = markersRef.current[markerId];

    // 2. If not found, look up assigned driver explicitly or through active trips
    if (!marker) {
      let driverId = null;
      const assignedDriver = driversStateRef.current.find(d => d.truck?.id === truck.id);
      if (assignedDriver) {
        driverId = assignedDriver.id;
      } else {
        const activeTrip = tripsRef.current.find(t => 
          t.truck?.id === truck.id && 
          ['in_progress', 'confirmed', 'pending'].includes(t.status)
        );
        if (activeTrip && activeTrip.driver) {
          driverId = activeTrip.driver.id;
        }
      }
      if (driverId) {
        markerId = driverId;
        marker = markersRef.current[markerId];
      }
    }

    // 3. If marker is found on the map, use its exact coordinates
    if (marker) {
      const lngLat = marker.getLngLat();
      lng = lngLat.lng;
      lat = lngLat.lat;
    } else {
      // 4. Fallback to state if marker isn't registered (e.g. initial load glitch)
      const latestTruck = trucksStateRef.current.find(t => t.id === truck.id) || truck;
      lat = latestTruck.currentLat;
      lng = latestTruck.currentLng;
      
      if (!lat || !lng) {
        let drv = driversStateRef.current.find(d => d.truck?.id === truck.id);
        if (!drv) {
          const activeTrip = tripsRef.current.find(t => 
            t.truck?.id === truck.id && 
            ['in_progress', 'confirmed', 'pending'].includes(t.status)
          );
          if (activeTrip && activeTrip.driver) {
            drv = driversStateRef.current.find(d => d.id === activeTrip.driver.id || d.user?.id === activeTrip.driver.id);
          }
        }
        if (drv) {
          lat = drv.currentLat;
          lng = drv.currentLng;
        }
      }
    }

    const finalLng = Number(lng);
    const finalLat = Number(lat);

    if (!isNaN(finalLng) && !isNaN(finalLat) && finalLng !== 0 && finalLat !== 0 && mapInstance.current) {
      try {
        mapInstance.current.flyTo({
          center: [finalLng, finalLat],
          zoom: 15,
          speed: 1.5,
          essential: true
        });
        toast.success(`${t('focusOnTruck')}${truck.plateNumber || ''}`);
      } catch (err) {
        // Fallback if flyTo fails
        mapInstance.current.setCenter([finalLng, finalLat]);
        mapInstance.current.setZoom(15);
        toast.success(`${t('focusOnTruck')}${truck.plateNumber || ''}`);
      }
    } else {
      toast.error(`${truck.plateNumber || ''}${t('noActiveCoordinates')}`);
    }
  };

  useEffect(() => {
    const getWsUrl = () => {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        return apiUrl.replace(/\/api\/?$/, '');
      }
      return 'http://localhost:3001';
    };

    const socket = io(getWsUrl());
    socket.on('locationUpdate', (data: any) => {
      let driverName = 'Șofer';
      let plateNumber = 'SV 19 HAP';
      let resolvedTruckId = data.truckId;
      
      // Look up driver and active trip in current refs
      const currentDriver = driversStateRef.current.find(d => d.id === data.driverId || d.user?.id === data.driverId);
      if (currentDriver) {
        driverName = currentDriver.user?.name || 'Șofer';
      }

      const activeTrip = tripsRef.current.find(t => 
        (t.driver?.id === data.driverId || t.driver?.user?.id === data.driverId || t.driver?.id === currentDriver?.id) &&
        ['in_progress', 'confirmed', 'pending'].includes(t.status)
      );

      if (activeTrip && activeTrip.truck) {
        resolvedTruckId = activeTrip.truck.id;
      } else if (currentDriver && currentDriver.truck) {
        resolvedTruckId = currentDriver.truck.id;
      }

      const finalTruckId = resolvedTruckId || data.driverId;

      // Update state and refs for React
      setDrivers(prev => {
        const updated = prev.map(d => {
          if (d.id === data.driverId || d.user?.id === data.driverId) {
            return { ...d, currentLat: data.lat, currentLng: data.lng };
          }
          return d;
        });
        driversStateRef.current = updated;
        return updated;
      });

      setTrucks(prev => {
        const updated = prev.map(t => {
          if (t.id === finalTruckId) {
            return { ...t, currentLat: data.lat, currentLng: data.lng };
          }
          return t;
        });
        trucksStateRef.current = updated;
        return updated;
      });

      // Remove standalone driver marker if they are now assigned to a truck
      if (finalTruckId !== data.driverId && markersRef.current[data.driverId]) {
        markersRef.current[data.driverId].remove();
        delete markersRef.current[data.driverId];
      }

      // Try to resolve the plate number from the updated trucks list
      const matchedTruck = trucksStateRef.current.find(t => t.id === finalTruckId);
      if (matchedTruck) {
        plateNumber = matchedTruck.plateNumber;
      } else {
        plateNumber = activeTrip?.truck?.plateNumber || currentDriver?.truck?.plateNumber || 'SV 19 HAP';
      }

      const lang = i18n.language || 'ro';
      const truckWord = TRUCK_TRANSLATIONS[lang] || TRUCK_TRANSLATIONS['ro'];
      const label = plateNumber;

      // Smoothly update the marker coordinate
      const existingMarker = markersRef.current[finalTruckId];
      if (existingMarker) {
        const startLngLat = existingMarker.getLngLat();
        
        // Calculate dynamic animation duration based on actual time elapsed since last update
        const now = Date.now();
        const lastTime = lastUpdateTimesRef.current[finalTruckId];
        let animDuration = 4500; // default to 4.5s (since interval is reduced to 5s)
        if (lastTime) {
          const diff = now - lastTime;
          // Clamp duration to prevent visual glitches (e.g. between 1.5s and 25s)
          // Subtract 500ms to ensure the animation finishes slightly before the next update
          animDuration = Math.max(1500, Math.min(25000, diff - 500));
        }
        lastUpdateTimesRef.current[finalTruckId] = now;

        animateMarker(
          finalTruckId,
          existingMarker,
          [startLngLat.lng, startLngLat.lat],
          [parseFloat(data.lng), parseFloat(data.lat)],
          animDuration
        );

        // Update the label DOM text
        const el = existingMarker.getElement();
        if (el) {
          const labelEl = el.querySelector('.marker-label');
          if (labelEl) {
            labelEl.innerHTML = `<span style="color:#FF7A1A">🚚</span> ${label}`;
          }
        }

        // Update popup info
        const popup = existingMarker.getPopup();
        if (popup) {
          const driverWord = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS['ro'];
          const isPlaceholder = driverName === '?ofer' || driverName === 'Șofer';
          const subHtml = (!isPlaceholder && driverName) ? 
            `<div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:4px">
               <span style="font-weight:bold;color:#FF7A1A">${driverWord}:</span> ${driverName}
             </div>` : '';
          popup.setHTML(`
            <div style="font-family:sans-serif;padding:6px 8px;min-width:140px">
              <div style="font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:4px;border-bottom:1px solid #E2E8F0;padding-bottom:4px">${label}</div>
              ${subHtml}
            </div>
          `);
        }
      } else {
        addMarker(finalTruckId, parseFloat(data.lng), parseFloat(data.lat), label, driverName);
      }

      // Update the routing line in real-time without forcing the camera center
      if (focusedTruckRef.current && focusedTruckRef.current.id === finalTruckId) {
        if (matchedTruck) {
          drawRoute(matchedTruck, true); // update routing line without resetting zoom bounds
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [i18n.language]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input 
            type="text" 
            className="input pl-9 pr-4 py-2 w-full bg-card border border-border rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 text-sm"
            placeholder={t('searchTruckRefCity') || "Caută camion, oraș sau referință..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button"
            onClick={() => setIsSatellite(!isSatellite)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-surface transition-colors shadow-sm"
          >
            {isSatellite ? (
              <><MapIcon className="w-4 h-4 text-primary" /> Hartă Standard</>
            ) : (
              <><MapIcon className="w-4 h-4 text-primary" /> Satelit</>
            )}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-success font-medium bg-success/10 px-3 py-1.5 rounded-full whitespace-nowrap">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse-dot" /> Live
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {trucks.slice(0, 8).map((truck: any) => (
          <div 
            key={truck.id} 
            onClick={() => { focusOnTruck(truck); drawRoute(truck); }}
            className="card flex items-center gap-3 py-3 bg-card border border-border rounded-xl cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${truck.status === 'in_trip' ? 'bg-primary-light' : 'bg-surface'}`}>
              <Truck className={`w-4 h-4 ${truck.status === 'in_trip' ? 'text-primary' : 'text-text-secondary'}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">{truck.plateNumber}</div>
              <div className="text-xs text-text-secondary capitalize">{t(truck.status)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm" style={{ minHeight: '520px', height: 'calc(100vh - 280px)' }}>
        <div ref={mapRef} className="w-full h-full" />
      </div>
      {drivers.filter(d => d.currentLat).length === 0 && trucks.filter(t => t.currentLat).length === 0 && (
        <div className="card flex flex-col items-center py-8 text-center bg-card border border-border rounded-xl">
          <Navigation className="w-10 h-10 text-text-light mb-3" />
          <p className="text-text-secondary text-sm">{t('noActiveLocations')}</p>
        </div>
      )}
    </div>
  );
}
