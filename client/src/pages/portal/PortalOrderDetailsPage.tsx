import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import portalApi from '../../lib/portalApi';
import PortalOrderDrawer from '../../components/orders/PortalOrderDrawer';

// Deep-link route (/portal/orders/:id): shows the same TMS-style drawer as the orders list.
export default function PortalOrderDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === 'null' || id === 'undefined') {
      setLoading(false);
      return;
    }
    portalApi.get(`/portal/orders/${id}`)
      .then(r => setOrder(r.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">{t('jsx_loadingOrderD')}</div>;
  if (!order) return (
    <div className="p-8 text-center space-y-4">
      <div>{t('jsx_orderNotFound')}</div>
      <button className="btn-secondary" onClick={() => navigate('/portal/orders')}>{t('jsx_myOrders', 'My orders')}</button>
    </div>
  );
  return <PortalOrderDrawer order={order} onClose={() => navigate('/portal/orders')} />;
}