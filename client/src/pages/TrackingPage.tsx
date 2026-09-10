import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Package, MapPin, CheckCircle, Clock, Truck, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api';

export default function TrackingPage() {
  const { t } = useTranslation();
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const trackingToken = token || id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [trackingToken]);

  const fetchData = async () => {
    if (!trackingToken) {
      setError('Tracking link invalid or expired.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/track/${trackingToken}`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      setError('Tracking link invalid or expired.');
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div></div>;
  }
  if (error || !data) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("jsx_orderNotFound")}</h2>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </div>;
  }
  const getTimeAgo = (dateStr: string) => {
    const min = Math.round((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    return `${Math.floor(min / 60)}h ${min % 60}m ago`;
  };
  const isDelivered = ['delivered', 'pod_received', 'invoiced', 'paid'].includes(data.status);
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t("jsx_trackingSummar")}</p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">{t("jsx_order")}{data.orderNumber}
              </h1>
              {data.customerReference && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t("jsx_ref")}{data.customerReference}</p>}
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${isDelivered ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400'}`}>
                {isDelivered ? <CheckCircle className="w-4 h-4 mr-2" /> : <Truck className="w-4 h-4 mr-2 animate-bounce" />}
                {data.status?.toUpperCase().replace('_', ' ') || 'UNKNOWN'}
              </span>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />{t("jsx_lastUpdated")}{getTimeAgo(data.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Time Windows & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="text-blue-500" />{t("jsx_routeInfo")}</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
              {data.stops.map((stop: any, index: number) => <div key={stop.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-white bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {index === 0 ? <Package className="w-5 h-5" /> : index === data.stops.length - 1 ? <CheckCircle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl shadow-sm">
                    <p className="font-bold text-gray-900 dark:text-white">{stop.companyName || 'Unknown Location'}</p>
                    <p className="text-sm text-gray-500">{stop.address}, {stop.country}</p>
                    <p className="text-xs font-semibold text-gray-400 mt-2 uppercase">{stop.type}</p>
                  </div>
                </div>)}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="text-orange-500" />{t("jsx_timeWindows")}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{t("jsx_estimatedPicku")}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{data.pickupWindow || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t("jsx_estimatedDeliv")}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{data.deliveryWindow || 'Not set'}</span>
                </div>
              </div>
            </div>

            {isDelivered && data.documents && data.documents.length > 0 && <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="text-green-500" />{t("jsx_documentsPOD")}</h3>
                <div className="space-y-3">
                  {data.documents.map((doc: any) => <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{doc.name}</span>
                      <span className="text-xs text-primary-600 font-semibold">{t("jsx_view")}</span>
                    </a>)}
                </div>
              </div>}
          </div>
        </div>

      </div>
    </div>;
}