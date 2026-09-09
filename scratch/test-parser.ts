import * as XLSX from 'xlsx';
import { SpreadsheetOrderParser } from '../server/src/trips/spreadsheet-order-parser';

const rows = [
  ['Vracht auto nr', 'Cp order nr', 'Klant', 'Laadplaats', 'Laaddatum', 'Tijd af magazijn', 'Lossdatum', 'Aantal paletten', 'Gewicht', 'Factuur info'],
  ['683940', '811266', 'Koopman International BV', 'Vijn Echt', '2026-08-24 06:00', '06:00', '2026-08-29', 33, '7367 kg', 'PAKI ACCOUNT 030533; DDP'],
  ['683941', '811267', 'Koopman International BV', 'Jumbo, Veghel', '24/08/2026', '', '29-08-2026', '12', '8,5 t', ''],
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Orders');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

const trips = SpreadsheetOrderParser.parse(buf);
console.log('trips:', trips.length);
console.log(JSON.stringify(trips, null, 1));
