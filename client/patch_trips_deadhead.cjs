const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/TripsPage.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('const [deadheadWarning, setDeadheadWarning]')) {
    c = c.replace('const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });',
        'const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });\n  const [deadheadWarning, setDeadheadWarning] = useState<{dist: number, cost: number, from: string} | null>(null);');
}

const useEffectHook = `
  useEffect(() => {
    const calcDeadhead = async () => {
      if (!form.truckId || !form.pickupAddress) {
        setDeadheadWarning(null);
        return;
      }
      const truckTrips = trips.filter(t => t.truck?.id === form.truckId && t.id !== editId).sort((a,b) => new Date(b.dropoffDate).getTime() - new Date(a.dropoffDate).getTime());
      const lastTrip = truckTrips.length > 0 ? truckTrips[0] : null;
      if (lastTrip && lastTrip.dropoffAddress) {
        try {
          const res = await api.post('/routing/calculate', {
            originAddress: lastTrip.dropoffAddress,
            destAddress: form.pickupAddress,
            weightKg: 0
          });
          if (res.data && res.data.distanceKm && res.data.distanceKm > 10) {
            const cost = (res.data.distanceKm / 100) * 28 * dieselPrice;
            setDeadheadWarning({ dist: res.data.distanceKm, cost, from: lastTrip.dropoffAddress.split(',')[0] });
          } else {
            setDeadheadWarning(null);
          }
        } catch(e) { setDeadheadWarning(null); }
      } else {
        setDeadheadWarning(null);
      }
    };
    calcDeadhead();
  }, [form.truckId, form.pickupAddress, trips, editId, dieselPrice]);
`;

if (!c.includes('calcDeadhead = async')) {
    c = c.replace('useEffect(() => {', useEffectHook + '\n  useEffect(() => {');
}

c = c.replace(
    "} catch { toast.error(t('saveError')); }",
    "} catch (err: any) { toast.error(err.response?.data?.message || t('saveError')); }"
);

const deadheadWarningUI = `
              {deadheadWarning && (
                <div className="col-span-full bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 text-orange-800">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-bold">Atenție: Camionul va rula pe gol {Math.round(deadheadWarning.dist)} km!</p>
                      <p className="text-sm opacity-90">De la <b>{deadheadWarning.from}</b> până la punctul de încărcare. Cost suplimentar estimat: <b>€{deadheadWarning.cost.toFixed(2)}</b>.</p>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary py-1.5 px-3 text-sm border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => {
                    const currentEst = Number(form.estimatedCost) || 0;
                    setForm({...form, estimatedCost: (currentEst + deadheadWarning.cost).toFixed(2)});
                    setDeadheadWarning(null);
                  }}>
                    Adaugă la cost estimat
                  </button>
                </div>
              )}
`;

if (!c.includes('Atenție: Camionul va rula pe gol')) {
    c = c.replace('{/* Dates & Times */}', deadheadWarningUI + '\n              {/* Dates & Times */}');
}

// Add AlertTriangle to lucide-react import
if (!c.includes('AlertTriangle')) {
    c = c.replace("import { Plus, Edit2, Trash2", "import { AlertTriangle, Plus, Edit2, Trash2");
}

fs.writeFileSync(path, c);
console.log('TripsPage updated');
