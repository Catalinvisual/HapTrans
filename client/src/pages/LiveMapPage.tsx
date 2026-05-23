import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, Truck, Play, Pause, Square, Map as MapIcon, Layers } from 'lucide-react';
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

export default function LiveMapPage() {
  const { t, i18n } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [_, setTrips] = useState<any[]>([]);

  // Refs to avoid stale closures in the WebSocket listener
  const tripsRef = useRef<any[]>([]);
  const trucksStateRef = useRef<any[]>([]);
  const driversStateRef = useRef<any[]>([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
    return () => { document.head.removeChild(link); };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.maplibregl) return;
    mapInstance.current = new window.maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
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
    
    // Add OpenFreeMap attribution manually
    mapInstance.current.addControl(new window.maplibregl.AttributionControl({
      customAttribution: '© OpenStreetMap contributors',
      compact: true,
    }), 'bottom-right');
    loadLocations();
  };

  const loadLocations = async () => {
    try {
      const [dr, tr, tripsRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/trucks'),
        api.get('/trips')
      ]);
      setDrivers(dr.data); setTrucks(tr.data); setTrips(tripsRes.data);
      driversStateRef.current = dr.data;
      trucksStateRef.current = tr.data;
      tripsRef.current = tripsRes.data;
      
      const activeTruckDrivers: Record<string, string> = {};
      tripsRes.data.forEach((trip: any) => {
        if ((trip.status === 'in_progress' || trip.status === 'confirmed') && trip.truck && trip.driver) {
          activeTruckDrivers[trip.truck.id] = trip.driver.user?.name || 'Șofer';
        }
      });

      const lang = i18n.language || 'ro';
      const truckWord = TRUCK_TRANSLATIONS[lang] || TRUCK_TRANSLATIONS['ro'];

      // Plot trucks with coordinates
      tr.data.forEach((t: any) => {
        if (t.currentLat && t.currentLng) {
          const driverName = activeTruckDrivers[t.id] || t.driver?.user?.name || 'Șofer';
          const label = `${truckWord} (${t.plateNumber})`;
          addMarker(t.id, parseFloat(t.currentLng), parseFloat(t.currentLat), label, driverName);
        }
      });

      // Plot drivers with coordinates using their allotted truck or driver details
      dr.data.forEach((d: any) => {
        if (d.currentLat && d.currentLng) {
          const plate = d.truck?.plateNumber || 'SV 19 HAP';
          const label = `${truckWord} (${plate})`;
          const driverName = d.user?.name || 'Șofer';
          
          if (!markersRef.current[d.truck?.id || '']) {
            addMarker(d.id, parseFloat(d.currentLng), parseFloat(d.currentLat), label, driverName);
          }
        }
      });
    } catch (e) { console.error(e); }
  };

  const addMarker = (id: string, lng: number, lat: number, label: string, popupText: string) => {
    if (!mapInstance.current || !window.maplibregl) return;
    if (markersRef.current[id]) markersRef.current[id].remove();
    
    const color = '#FF7A1A'; 
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:white;margin:auto"><path d="M14 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10"/><path d="M14 2v16"/><path d="M14 10h5l3 3v3h-8"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>`;

    const lang = i18n.language || 'ro';
    const driverWord = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS['ro'];

    const el = document.createElement('div');
    el.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer`;
    el.innerHTML = `
      <div style="background:#0F172A;color:#FFFFFF;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.3);margin-bottom:6px;border:1.5px solid #FF7A1A;display:flex;align-items:center;gap:6px">
        <span style="color:#FF7A1A">🚚</span> ${label}
      </div>
      <div style="width:38px;height:38px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 0 15px rgba(255,122,26,0.6)">
        ${svgIcon}
      </div>
    `;

    el.addEventListener('click', (e) => {
      // Ensure we catch it before MapLibre stops propagation
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
        drawRoute(truck);
      }
    }, true);

    const marker = new window.maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new window.maplibregl.Popup({ offset: 30 }).setHTML(`
        <div style="font-family:sans-serif;padding:6px 8px;min-width:140px">
          <div style="font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:4px;border-bottom:1px solid #E2E8F0;padding-bottom:4px">${label}</div>
          <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:4px">
            <span style="font-weight:bold;color:#FF7A1A">${driverWord}:</span> ${popupText}
          </div>
        </div>
      `))
      .addTo(mapInstance.current);
    markersRef.current[id] = marker;
  };

  const drawRoute = async (truck: any) => {
    if (!mapInstance.current) return;

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
    const destAddress = isPending ? activeTrip.pickupAddress : activeTrip.dropoffAddress;
    const destLabel = isPending ? etaLabels.pickup : etaLabels.dropoff;

    if (!destAddress) {
      return;
    }

    const loadToast = toast.loading(etaLabels.calcRoute);
    try {
      const payload: any = { destAddress };
      if (truck.currentLat && truck.currentLng) {
        payload.originLat = parseFloat(truck.currentLat);
        payload.originLng = parseFloat(truck.currentLng);
      } else {
        payload.originAddress = activeTrip.pickupAddress;
      }

      const res = await api.post('/routing/calculate', payload);
      const data = res.data;
      if (data.error) {
        throw new Error(`${data.error}. Date trimise: ${JSON.stringify(payload)}`);
      }
      if (!data?.coordinates?.length) throw new Error(etaLabels.errNoCoords);

      const coords = data.coordinates.map((c: number[]) => [c[0], c[1]]);
      const sourceId = 'route-source';
      const layerId = 'route-layer';

      // Remove existing route layer
      if (mapInstance.current.getLayer(layerId)) mapInstance.current.removeLayer(layerId);
      if (mapInstance.current.getSource(sourceId)) mapInstance.current.removeSource(sourceId);

      mapInstance.current.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} },
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
      
      if (minLng !== Infinity) {
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
      toast.dismiss(loadToast);
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(`${etaLabels.errRoute} ${err.message || etaLabels.errUnknown}`);
      console.error(err);
    }
  };

  const focusOnTruck = (truck: any) => {
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
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
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

      // Try to resolve the plate number from the updated trucks list
      const matchedTruck = trucksStateRef.current.find(t => t.id === finalTruckId);
      if (matchedTruck) {
        plateNumber = matchedTruck.plateNumber;
      } else {
        plateNumber = activeTrip?.truck?.plateNumber || currentDriver?.truck?.plateNumber || 'SV 19 HAP';
      }

      const lang = i18n.language || 'ro';
      const truckWord = TRUCK_TRANSLATIONS[lang] || TRUCK_TRANSLATIONS['ro'];
      const label = `${truckWord} (${plateNumber})`;
      
      if (markersRef.current[data.driverId]) {
        markersRef.current[data.driverId].remove();
        delete markersRef.current[data.driverId];
      }
      if (finalTruckId && markersRef.current[finalTruckId]) {
        markersRef.current[finalTruckId].remove();
        delete markersRef.current[finalTruckId];
      }

      addMarker(finalTruckId, parseFloat(data.lng), parseFloat(data.lat), label, driverName);
    });
    return () => { socket.disconnect(); };
  }, [i18n.language]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('liveMap')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t('realTimePositions')}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-success font-medium">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse-dot" /> Live
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {trucks.slice(0, 8).map((truck: any) => (
          <div 
            key={truck.id} 
            onClick={() => { focusOnTruck(truck); drawRoute(truck); }}
            className="card flex items-center gap-3 py-3 bg-white border border-border rounded-xl cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-[0.98]"
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
      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm" style={{ height: '520px' }}>
        <div ref={mapRef} className="w-full h-full" />
      </div>
      {drivers.filter(d => d.currentLat).length === 0 && trucks.filter(t => t.currentLat).length === 0 && (
        <div className="card flex flex-col items-center py-8 text-center bg-white border border-border rounded-xl">
          <Navigation className="w-10 h-10 text-text-light mb-3" />
          <p className="text-text-secondary text-sm">{t('noActiveLocations')}</p>
        </div>
      )}
    </div>
  );
}
