import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Truck, Calendar, Package, Download, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';

// Leaflet default icons fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
export default function PortalOrderDetailsPage() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    portalApi.get(`/portal/orders/${id}`).then(r => {
      setOrder(r.data);
      setLoading(false);
    });
  }, [id]);
  if (loading) return <div className="p-8 text-center animate-pulse">{t("jsx_loadingOrderD")}</div>;
  if (!order) return <div className="p-8 text-center">{t("jsx_orderNotFound")}</div>;
  const hasTracking = order.trip?.locations && order.trip.locations.length > 0;
  const latestLocation = hasTracking ? order.trip.locations[order.trip.locations.length - 1] : null;
  return <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/portal/orders')} className="p-2 hover:bg-surface rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{t("jsx_order")}{order.referenceNumber}</h1>
          <p className="text-sm text-text-secondary">{t("jsx_trackingDeta")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize
            ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'in-transit' ? 'bg-blue-100 text-blue-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            {order.status?.replace('-', ' ') || 'UNKNOWN'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tracking Map & Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="h-[400px] bg-surface relative z-10">
              {/* Fake locations for demonstration if none exist, otherwise real */}
              <MapContainer center={latestLocation ? [latestLocation.latitude, latestLocation.longitude] : [45.9432, 24.9668]} zoom={5} className="w-full h-full" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                {latestLocation && <Marker position={[latestLocation.latitude, latestLocation.longitude]} />}
              </MapContainer>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-text-secondary font-medium mb-1">{t("jsx_currentStatus")}</p>
                  <p className="font-bold text-sm capitalize">{order.status}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium mb-1">{t("jsx_eTA")}</p>
                  <p className="font-bold text-sm text-primary">{order.deliveryDate ? formatDate(order.deliveryDate) : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium mb-1">{t("jsx_truck")}</p>
                  <p className="font-bold text-sm">{order.trip?.truck?.plateNumber || 'TBD'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium mb-1">{t("jsx_driver")}</p>
                  <p className="font-bold text-sm">{order.trip?.driver?.name || 'TBD'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-card border border-border rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">{t("jsx_routeDetails")}</h3>
            
            <div className="space-y-6 relative">
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border"></div>
              
              <div className="flex gap-4 relative">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex flex-col items-center justify-center shrink-0 bg-white z-10">
                  <span className="text-xs font-bold text-primary">A</span>
                </div>
                <div className="pt-1">
                  <p className="font-bold text-lg">{order.pickupCity}</p>
                  <p className="text-sm text-text-secondary">{order.pickupAddress}</p>
                  <p className="text-sm font-medium mt-1"><Calendar className="w-4 h-4 inline mr-1 text-primary" /> {formatDate(order.pickupDate)}</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex flex-col items-center justify-center shrink-0 bg-white z-10">
                  <span className="text-xs font-bold text-success">B</span>
                </div>
                <div className="pt-1">
                  <p className="font-bold text-lg">{order.deliveryCity}</p>
                  <p className="text-sm text-text-secondary">{order.deliveryAddress}</p>
                  <p className="text-sm font-medium mt-1"><Calendar className="w-4 h-4 inline mr-1 text-success" /> {formatDate(order.deliveryDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cargo & Docs */}
        <div className="space-y-6">
          <div className="card bg-card border border-border rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Package className="w-5 h-5" />{t("jsx_cargoInformati")}</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-text-secondary font-medium">{t("jsx_description")}</p>
                <p className="font-bold">{order.cargoDescription || 'General Cargo'}</p>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-secondary">{t("jsx_weight")}</span>
                <span className="font-bold">{order.weight} kg</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-secondary">{t("jsx_volumeLDM")}</span>
                <span className="font-bold">{order.ldm || 0}{t("jsx_lDM")}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-secondary">{t("jsx_pallets")}</span>
                <span className="font-bold">{order.pallets || 0}{t("jsx_eUR")}</span>
              </div>
              {order.requiresTemperatureControl && <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary">{t("jsx_temperature")}</span>
                  <span className="font-bold text-blue-600">{order.temperature}°C</span>
                </div>}
              {order.isADR && <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary">{t("jsx_aDR")}</span>
                  <span className="font-bold text-orange-600">{t("jsx_yesClass")}{order.adrClass})</span>
                </div>}
            </div>
          </div>

          <div className="card bg-card border border-border rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Download className="w-5 h-5" />{t("jsx_documents")}</h3>
            <div className="space-y-3">
              {/* Placeholder documents, since we didn't implement real file upload yet */}
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-surface transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <span className="font-bold text-xs">{t("jsx_pDF")}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{t("jsx_cMRDocument")}</p>
                    <p className="text-xs text-text-secondary">{t("jsx_cmr1024Pdf")}</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-text-secondary group-hover:text-primary" />
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-surface transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <span className="font-bold text-xs">{t("jsx_pDF")}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{t("jsx_proofOfDelive")}</p>
                    <p className="text-xs text-text-secondary">{t("jsx_pod1024Pdf")}</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-text-secondary group-hover:text-primary" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>;
}