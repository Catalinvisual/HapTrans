const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/pages/TrucksPage.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  "const [form, setForm] = useState({ plateNumber: '', brand: '', model: '', year: '', payloadCapacity: '', fuelConsumption: '' });",
  "const [form, setForm] = useState({ plateNumber: '', brand: '', model: '', year: '', payloadCapacity: '', fuelConsumption: '', totalMileage: '', nextMaintenanceMileage: '' });"
);

c = c.replace(
  "setShowForm(false); setEditId(null); setForm({ plateNumber: '', brand: '', model: '', year: '', payloadCapacity: '', fuelConsumption: '' });",
  "setShowForm(false); setEditId(null); setForm({ plateNumber: '', brand: '', model: '', year: '', payloadCapacity: '', fuelConsumption: '', totalMileage: '', nextMaintenanceMileage: '' });"
);

const formFieldsOld = `              {[
                { key: 'plateNumber', label: t('plateNumber'), required: true },
                { key: 'brand', label: t('brand'), required: true },
                { key: 'model', label: t('model'), required: true },
                { key: 'year', label: t('year'), type: 'number' },
                { key: 'payloadCapacity', label: t('capacity'), type: 'number' },
                { key: 'fuelConsumption', label: t('consumption'), type: 'number' },
              ].map(f => (`;

const formFieldsNew = `              {[
                { key: 'plateNumber', label: t('plateNumber'), required: true },
                { key: 'brand', label: t('brand'), required: true },
                { key: 'model', label: t('model'), required: true },
                { key: 'year', label: t('year'), type: 'number' },
                { key: 'payloadCapacity', label: t('capacity'), type: 'number' },
                { key: 'fuelConsumption', label: t('consumption'), type: 'number' },
                { key: 'totalMileage', label: 'Kilometraj curent (KM)', type: 'number' },
                { key: 'nextMaintenanceMileage', label: 'Revizie la (KM)', type: 'number' },
              ].map(f => (`;

c = c.replace(formFieldsOld, formFieldsNew);

const tableHeaderOld = `                {[t('plateNumber'), t('brand'), t('model'), t('year'), t('capacity'), t('consumption'), t('status'), t('documents'), t('actions')].map(h => (`;
const tableHeaderNew = `                {[t('plateNumber'), t('brand'), t('model'), t('year'), t('capacity'), 'Status Mentenanță', t('status'), t('documents'), t('actions')].map(h => (`;

c = c.replace(tableHeaderOld, tableHeaderNew);

const tableRowOld = `                    <td className="table-cell">
                      <select 
                        className="input py-1 px-2 text-xs font-semibold bg-surface border-border uppercase"
                        value={truck.status}
                        onChange={e => handleUpdateStatus(truck.id, e.target.value)}
                      >
                        <option value="active">{t('status_active')}</option>
                        <option value="in_trip">{t('status_inTrip')}</option>
                        <option value="maintenance">{t('status_maintenance')}</option>
                        <option value="inactive">{t('status_inactive')}</option>
                      </select>
                    </td>`;

const tableRowNew = `                    <td className="table-cell">
                      {Number(truck.totalMileage || 0) >= Number(truck.nextMaintenanceMileage || 50000) ? (
                         <div className="bg-error/10 text-error px-2 py-1 rounded-md text-xs font-bold inline-block border border-error/20">
                           🔴 Mentenanță Necesară<br/>
                           <span className="text-[9px] font-medium opacity-80">{Number(truck.totalMileage).toLocaleString()} / {Number(truck.nextMaintenanceMileage).toLocaleString()} km</span>
                         </div>
                      ) : (
                         <div className="bg-success/10 text-success px-2 py-1 rounded-md text-xs font-bold inline-block border border-success/20">
                           ✅ OK<br/>
                           <span className="text-[9px] font-medium opacity-80">{Number(truck.totalMileage || 0).toLocaleString()} / {Number(truck.nextMaintenanceMileage || 50000).toLocaleString()} km</span>
                         </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <select 
                        className="input py-1 px-2 text-xs font-semibold bg-surface border-border uppercase"
                        value={truck.status}
                        onChange={e => handleUpdateStatus(truck.id, e.target.value)}
                      >
                        <option value="active">{t('status_active')}</option>
                        <option value="in_trip">{t('status_inTrip')}</option>
                        <option value="maintenance">{t('status_maintenance')}</option>
                        <option value="inactive">{t('status_inactive')}</option>
                      </select>
                    </td>`;

c = c.replace(tableRowOld, tableRowNew);

const tableDeleteOld = `                      <button onClick={() => { setForm({ plateNumber: truck.plateNumber, brand: truck.brand, model: truck.model, year: truck.year, payloadCapacity: truck.payloadCapacity, fuelConsumption: truck.fuelConsumption }); setEditId(truck.id); setShowForm(true); }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">`;

const tableDeleteNew = `                      <button onClick={() => { setForm({ plateNumber: truck.plateNumber, brand: truck.brand, model: truck.model, year: truck.year, payloadCapacity: truck.payloadCapacity, fuelConsumption: truck.fuelConsumption, totalMileage: truck.totalMileage || '', nextMaintenanceMileage: truck.nextMaintenanceMileage || '' }); setEditId(truck.id); setShowForm(true); }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">`;

c = c.replace(tableDeleteOld, tableDeleteNew);

// Remove the consumption column to fit the maintenance status
c = c.replace(tableHeaderNew, `                {[t('plateNumber'), t('brand'), t('model'), t('year'), 'Mentenanță', t('status'), t('documents'), t('actions')].map(h => (`);
c = c.replace(/<td className="table-cell font-medium text-primary">\{truck.payloadCapacity || '-'\} \/ \{truck.fuelConsumption || '-'\}<\/td>/, "");

fs.writeFileSync(path, c);
console.log('TrucksPage updated');
