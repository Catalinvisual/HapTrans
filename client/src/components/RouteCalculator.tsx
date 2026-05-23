import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation2, Loader2, RouteIcon, Clock, Gauge, Banknote, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import api from '../lib/api';

interface RouteResult {
  distanceKm: number;
  durationMin: number;
  durationText: string;
  tollCost: number;
  tollCurrency: string;
  source: 'here' | 'ors';
}

interface Props {
  pickupAddress: string;
  dropoffAddress: string;
  weightKg?: number;
  onApply: (result: { distanceKm: number; estimatedCost?: number }) => void;
  dieselPricePerL?: number;
  avgConsumptionL100?: number;
}

export default function RouteCalculator({
  pickupAddress,
  dropoffAddress,
  weightKg,
  onApply,
  dieselPricePerL = 1.68,
  avgConsumptionL100 = 32,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'ro';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  const calculate = async () => {
    if (!pickupAddress || !dropoffAddress) {
      setError(L.errEmpty);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/routing/calculate', {
        originAddress: pickupAddress,
        destAddress: dropoffAddress,
        weightKg: weightKg ? weightKg * 1000 : 40000,
        heightCm: 400,
        lengthCm: 1360,
      });
      if (res.data?.error) {
        setError(L.errCalc);
      } else {
        setResult(res.data);
        setExpanded(true);
      }
    } catch {
      setError(L.errFail);
    } finally {
      setLoading(false);
    }
  };

  const fuelCost = result ? (result.distanceKm / 100) * avgConsumptionL100 * dieselPricePerL : 0;
  const totalEstimated = result ? fuelCost + (result.tollCost || 0) : 0;

  const labels: Record<string, any> = {
    ro: { calc: 'Calculează rută', apply: 'Aplică în cursă', distance: 'Distanță', duration: 'Durata', tolls: 'Taxe drum', fuel: 'Combustibil estimat', total: 'Total estimat', source: 'Sursă date', errEmpty: 'Introduceți adresele de pickup și dropoff', errCalc: 'Nu s-a putut calcula ruta. Verificați adresele.', errFail: 'Eroare la calculul rutei', estCostTitle: 'Cost Estimat Rută', pressCalc: '↑ Apasă "Calculează rută" pentru distanță reală + ETA + costuri', calcLoading: 'Se calculează ruta camionului...' },
    en: { calc: 'Calculate route', apply: 'Apply to trip', distance: 'Distance', duration: 'Duration', tolls: 'Toll costs', fuel: 'Est. fuel cost', total: 'Total estimate', source: 'Data source', errEmpty: 'Enter pickup and dropoff addresses', errCalc: 'Could not calculate route. Check addresses.', errFail: 'Route calculation error', estCostTitle: 'Estimated Route Cost', pressCalc: '↑ Press "Calculate route" for real distance + ETA + costs', calcLoading: 'Calculating truck route...' },
    nl: { calc: 'Route berekenen', apply: 'Toepassen', distance: 'Afstand', duration: 'Duur', tolls: 'Tolkosten', fuel: 'Brandstofkosten', total: 'Totaal', source: 'Databron', errEmpty: 'Voer ophaal- en afleveradressen in', errCalc: 'Kon route niet berekenen. Controleer adressen.', errFail: 'Fout bij routeberekening', estCostTitle: 'Geschatte Routekosten', pressCalc: '↑ Druk op "Route berekenen" voor afstand + ETA + kosten', calcLoading: 'Vrachtwagenroute berekenen...' },
    de: { calc: 'Route berechnen', apply: 'Anwenden', distance: 'Distanz', duration: 'Dauer', tolls: 'Mautgebühren', fuel: 'Kraftstoffkosten', total: 'Gesamtschätzung', source: 'Datenquelle', errEmpty: 'Abhol- und Lieferadressen eingeben', errCalc: 'Route konnte nicht berechnet werden.', errFail: 'Routenberechnungsfehler', estCostTitle: 'Geschätzte Routenkosten', pressCalc: '↑ "Route berechnen" drücken für Distanz + ETA + Kosten', calcLoading: 'LKW-Route wird berechnet...' },
    fr: { calc: 'Calculer itinéraire', apply: 'Appliquer', distance: 'Distance', duration: 'Durée', tolls: 'Péages', fuel: 'Carburant estimé', total: 'Total estimé', source: 'Source', errEmpty: 'Entrez les adresses de départ et d\'arrivée', errCalc: 'Impossible de calculer l\'itinéraire.', errFail: 'Erreur de calcul', estCostTitle: 'Coût Estimé Itinéraire', pressCalc: '↑ Cliquez sur "Calculer itinéraire" pour distance + ETA + coûts', calcLoading: 'Calcul de l\'itinéraire camion...' },
  };
  const L = labels[lang] || labels['en'];

  return (
    <div className="border border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-blue-50/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <RouteIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-text">Route Calculator</span>
          {result && (
            <span className="text-xs px-2 py-0.5 bg-primary text-white rounded-full font-semibold">
              {result.distanceKm} km · {result.durationText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); calculate(); }}
            disabled={loading || !pickupAddress || !dropoffAddress}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {L.calc}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {error && (
            <div className="text-xs text-error bg-error/10 rounded-lg px-3 py-2 mb-3">{error}</div>
          )}

          {result && (
            <div className="space-y-2 animate-fade-in">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gauge className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-text-secondary font-medium">{L.distance}</span>
                  </div>
                  <span className="text-lg font-bold text-text">{result.distanceKm} <span className="text-sm font-normal text-text-secondary">km</span></span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] text-text-secondary font-medium">{L.duration}</span>
                  </div>
                  <span className="text-lg font-bold text-text">{result.durationText}</span>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border/50 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{L.estCostTitle}</span>
                </div>
                <div className="divide-y divide-border/50">
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-text-secondary">⛽ {L.fuel} ({avgConsumptionL100}L/100km @ €{dieselPricePerL.toFixed(2)}/L)</span>
                    <span className="text-sm font-semibold text-text">€{fuelCost.toFixed(2)}</span>
                  </div>
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-text-secondary">🛣️ {L.tolls}</span>
                    <span className="text-sm font-semibold text-text">
                      {result.tollCost > 0 ? `€${result.tollCost.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="px-3 py-2.5 flex justify-between items-center bg-primary/5">
                    <span className="text-xs font-bold text-primary uppercase">{L.total}</span>
                    <span className="text-base font-bold text-primary">€{totalEstimated.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Source Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-secondary">
                  {L.source}: {result.source === 'here' ? '📍 HERE Maps (truck routing)' : '🗺️ OpenRouteService'}
                </span>
                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => onApply({
                    distanceKm: result.distanceKm,
                    estimatedCost: parseFloat(totalEstimated.toFixed(2)),
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  {L.apply}
                </button>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <p className="text-xs text-text-secondary text-center py-2">
              {L.pressCalc}
            </p>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{L.calcLoading}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
