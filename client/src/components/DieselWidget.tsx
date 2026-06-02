import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Fuel, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/dateUtils';

interface DieselPrice {
  country: string;
  flag: string;
  price: number;
  currency: string;
  unit: string;
  source?: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  RO: '🇷🇴', NL: '🇳🇱', DE: '🇩🇪', FR: '🇫🇷', BE: '🇧🇪', PL: '🇵🇱', HU: '🇭🇺', AT: '🇦🇹',
};
const COUNTRY_NAMES: Record<string, Record<string, string>> = {
  ro: { RO: 'România', NL: 'Olanda', DE: 'Germania', FR: 'Franța', BE: 'Belgia', PL: 'Polonia', HU: 'Ungaria', AT: 'Austria' },
  en: { RO: 'Romania', NL: 'Netherlands', DE: 'Germany', FR: 'France', BE: 'Belgium', PL: 'Poland', HU: 'Hungary', AT: 'Austria' },
  nl: { RO: 'Roemenië', NL: 'Nederland', DE: 'Duitsland', FR: 'Frankrijk', BE: 'België', PL: 'Polen', HU: 'Hongarije', AT: 'Oostenrijk' },
  de: { RO: 'Rumänien', NL: 'Niederlande', DE: 'Deutschland', FR: 'Frankreich', BE: 'Belgien', PL: 'Polen', HU: 'Ungarn', AT: 'Österreich' },
  fr: { RO: 'Roumanie', NL: 'Pays-Bas', DE: 'Allemagne', FR: 'France', BE: 'Belgique', PL: 'Pologne', HU: 'Hongrie', AT: 'Autriche' },
};

const CACHE_KEY = 'haptrans_diesel_prices_v3';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export default function DieselWidget({ avgConsumptionL100 = 32 }: { avgConsumptionL100?: number }) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'ro';
  const [prices, setPrices] = useState<DieselPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPrices = async (force = false) => {
    // Check cache first
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setPrices(data);
          setLastUpdated(new Date(ts));
          setLoading(false);
          return;
        }
      }
    }
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/routing/diesel-prices');
      const data = res.data.map((p: any) => ({ ...p, flag: COUNTRY_FLAGS[p.country] || '🏳️' }));
      setPrices(data);
      setLastUpdated(new Date());
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPrices(); }, []);

  const TEXTS: Record<string, any> = {
    ro: { title: 'Prețuri Diesel EU', extErr: 'Date estimative — server extern indisponibil', calcTitle: 'Calculator cost combustibil (consum', est: 'Preț estimat' },
    en: { title: 'EU Diesel Prices', extErr: 'Estimated data — external server unavailable', calcTitle: 'Fuel cost calculator (consumption', est: 'Estimated price' },
    nl: { title: 'EU Dieselprijzen', extErr: 'Geschatte gegevens - externe server onbeschikbaar', calcTitle: 'Brandstofkostencalculator (verbruik', est: 'Geschatte prijs' },
    de: { title: 'EU Dieselpreise', extErr: 'Geschätzte Daten — externer Server nicht verfügbar', calcTitle: 'Kraftstoffkostenrechner (Verbrauch', est: 'Schätzpreis' },
    fr: { title: 'Prix du Diesel UE', extErr: 'Données estimées - serveur externe indisponible', calcTitle: 'Calculateur de coût de carburant (consommation', est: 'Prix estimé' },
  };
  const L = TEXTS[lang] || TEXTS['en'];

  const nlPrice = prices.find(p => p.country === 'NL')?.price || 0;

  const sortedPrices = [...prices].sort((a, b) => {
    if (a.country === 'NL') return -1;
    if (b.country === 'NL') return 1;
    return 0;
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">{L.title}</h3>
            {lastUpdated && (
              <p className="text-xs text-text-secondary">
                {formatDate(lastUpdated.toISOString())} {lastUpdated.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => loadPrices(true)}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-primary"
          title="Reîmprospătează"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-amber-700 text-xs mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{L.extErr}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Price Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {sortedPrices.map(p => {
              const diff = p.price - nlPrice;
              const isHigher = diff > 0.01;
              const isLower = diff < -0.01;
              const names = COUNTRY_NAMES[lang] || COUNTRY_NAMES['en'];
              return (
                <div
                  key={p.country}
                  className={`relative p-2.5 rounded-xl border transition-all ${
                    p.country === 'NL'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-surface hover:border-primary/30'
                  }`}
                >
                  <div className="text-lg mb-1">{p.flag || COUNTRY_FLAGS[p.country] || '🏳️'}</div>
                  <div className="text-[10px] text-text-secondary font-medium truncate">{names[p.country] || p.country}</div>
                  <div className="text-sm font-bold text-text">€{p.price.toFixed(2)}</div>
                  {p.country !== 'NL' && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 ${isHigher ? 'text-error' : isLower ? 'text-success' : 'text-text-secondary'}`}>
                      {isHigher ? <TrendingUp className="w-2.5 h-2.5" /> : isLower ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                    </div>
                  )}
                  {p.source === 'static' && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title={L.est} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cost Calculator */}
          {nlPrice > 0 && (
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs text-text-secondary mb-2 font-medium">💡 {L.calcTitle} {avgConsumptionL100}L/100km)</p>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(km => (
                  <div key={km} className="bg-surface rounded-lg p-2 text-center">
                    <div className="text-xs text-text-secondary">{km} km</div>
                    <div className="text-sm font-bold text-primary">
                      €{((km / 100) * avgConsumptionL100 * nlPrice).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
