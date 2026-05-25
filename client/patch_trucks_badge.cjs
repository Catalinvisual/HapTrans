const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/pages/TrucksPage.tsx';
let c = fs.readFileSync(path, 'utf8');

const oldCells = `<td className="table-cell text-text-secondary">{truck.payloadCapacity ? \`\${truck.payloadCapacity}t\` : '-'}</td>
                  <td className="table-cell text-text-secondary">{truck.fuelConsumption ? \`\${truck.fuelConsumption}l\` : '-'}</td>
                  <td className="table-cell"><span className={statusBadge(truck.status)}>{t(truck.status)}</span></td>`;

const newCells = `<td className="table-cell text-text-secondary">{truck.payloadCapacity ? \`\${truck.payloadCapacity}t\` : '-'}</td>
                  <td className="table-cell">
                      {Number(truck.totalMileage || 0) >= Number(truck.nextMaintenanceMileage || 50000) ? (
                         <div className="bg-error/10 text-error px-2 py-1 rounded-md text-xs font-bold inline-block border border-error/20">
                           🔴 Mentenanță Necesară<br/>
                           <span className="text-[9px] font-medium opacity-80">{Number(truck.totalMileage || 0).toLocaleString()} / {Number(truck.nextMaintenanceMileage || 50000).toLocaleString()} km</span>
                         </div>
                      ) : (
                         <div className="bg-success/10 text-success px-2 py-1 rounded-md text-xs font-bold inline-block border border-success/20">
                           ✅ OK<br/>
                           <span className="text-[9px] font-medium opacity-80">{Number(truck.totalMileage || 0).toLocaleString()} / {Number(truck.nextMaintenanceMileage || 50000).toLocaleString()} km</span>
                         </div>
                      )}
                  </td>
                  <td className="table-cell"><span className={statusBadge(truck.status)}>{t(truck.status)}</span></td>`;

c = c.replace(oldCells, newCells);

fs.writeFileSync(path, c);
console.log('TrucksPage cells updated');
