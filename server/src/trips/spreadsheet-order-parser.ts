import * as XLSX from 'xlsx';

/**
 * Deterministic spreadsheet -> trips parser.
 *
 * Replaces the LLM for .xlsx/.xls/.csv imports: instant, free and 100%
 * reproducible. Columns are mapped through a curated multilingual synonym
 * dictionary we control (much more reliable than prompting a model to guess
 * what "vracht auto nr" or "Tijd af magazijn" means).
 *
 * Any column WITHOUT a dedicated field is preserved verbatim into `notes`
 * ("Header: value") so absolutely all document information reaches the order.
 */

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Field claim priority: most specific first (e.g. klantreferentie before klant). */
const FIELD_SYNONYMS: Array<[string, string[]]> = [
  ['loadingReference', ['vracht auto nr', 'vracht autonr', 'vracht nummer', 'vrachtnummer', 'vracht nr', 'load nr', 'load number', 'load ref', 'loading ref', 'loading reference', 'ref laden', 'laad ref', 'cmr nr', 'cmr nummer', 'cmr', 'nr vracht']],
  ['customerReference', ['cp order nr', 'cp ordernr', 'cp order', 'klantreferentie', 'klant referentie', 'customer order nr', 'customer ref', 'customer reference', 'uw referentie', 'purchase order', 'po nr', 'po number', 'commission nr', 'your ref', 'opdracht nr klant']],
  ['unloadingReference', ['unloading ref', 'unloading reference', 'lossen ref', 'los ref', 'aflever nr', 'aflevernummer', 'unload ref', 'slot id', 'slot nr', 'slot']],
  ['pickupDate', ['laaddatum', 'laad datum', 'datum laden', 'loading date', 'load date', 'pickup date', 'pick up date', 'date of loading', 'chargement date', 'date chargement', 'verlade datum', 'ladedatum', 'data incarcarii', 'data incarcare']],
  ['pickupTime', ['tijd af magazijn', 'tijd op magazijn', 'tijd magazijn', 'magazijn tijd', 'laadtijd', 'laad tijd', 'tijd van laden', 'uur van laden', 'loading time', 'load time', 'pickup time', 'ladezeit', 'ora incarcarii']],
  ['dropoffDate', ['lossdatum', 'loss datum', 'losdatum', 'los datum', 'datum lossen', 'delivery date', 'unload date', 'unloading date', 'aflever datum', 'afleverdatum', 'afladen datum', 'entlade datum', 'entladedatum', 'dechargement', 'date de livraison', 'data livrarii', 'data livrare', 'drop off date', 'dropoff date']],
  ['dropoffTime', ['lostijd', 'los tijd', 'tijd van lossen', 'unload time', 'unloading time', 'delivery time', 'loszeit', 'ora livrarii']],
  ['pickupAddress', ['laadadres', 'laad adres', 'laad locatie', 'laadlocatie', 'loading address', 'loading location', 'pickup address', 'pickup location', 'afhaal adres', 'place of loading', 'adres incarcare']],
  ['dropoffAddress', ['losadres', 'los adres', 'los locatie', 'loslocatie', 'lossing adres', 'unloading address', 'unloading location', 'delivery address', 'delivery location', 'aflever adres', 'afleverlocatie', 'place of delivery', 'adres livrare']],
  ['weightKg', ['gewicht kg', 'gewicht', 'weight kg', 'weight', 'brutogewicht', 'bruto gewicht', 'brutto gewicht', 'brutto', 'bruto', 'poids', 'waga']],
  ['pallets', ['aantal paletten', 'paletten', 'palets', 'palet', 'pallets', 'pallet qty', 'qty pallets', 'epal', 'colli']],
  ['volumeCbm', ['volume m3', 'volume cbm', 'volume m³', 'm3', 'cbm', 'volumen', 'volume']],
  ['price', ['prijs', 'price', 'rate', 'tarief', 'fracht', 'freight cost', 'freight', 'cost']],
  ['currency', ['valuta', 'currency', 'munt', 'devise']],
  ['distanceKm', ['afstand km', 'afstand', 'distance km', 'distance', 'km stand']],
  ['contactPerson', ['contact persoon', 'contactpersoon', 'contact person', 'contact name', 'att']]
  ,
  ['contactPhone', ['telefoon nr', 'telefoonnummer', 'telefoon', 'telefon', 'phone', 'tel nr', 'tel', 'gsm', 'mobile']],
  ['notes', ['opmerking', 'opmerkingen', 'remarks', 'remark', 'note', 'notes', 'notitie', 'notities', 'bemerkung', 'bemerkungen', 'instructie', 'instructies', 'instructions', 'observatii']],
  ['pickupCompanyName', ['naam laden', 'laden bij', 'laden door', 'loading company', 'loader name', 'shipper name', 'shipper', 'verlader', 'expediteur', 'nume incarcator']],
  ['dropoffCompanyName', ['naam lossen', 'lossen bij', 'lossen aan', 'afleveren aan', 'delivery company', 'consignee name', 'consignee', 'ontvanger', 'destinatar']],
  ['clientName', ['opdrachtgever', 'opdracht gever', 'klant', 'customer name', 'customer', 'client name', 'client', 'auftraggeber', 'zleceniodawca']],
];

const TOTAL_ROW_WORDS = ['totaal', 'totaalregels', 'subtotaal', 'total', 'subtotal', 'sum', 'somme'];

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function excelSerialToMs(serial: number): number {
  // Excel day serial -> ms (Excel leap-year bug handled by the 1899-12-30 epoch)
  return EXCEL_EPOCH_UTC + Math.round(serial * 86400 * 1000);
}

/** Parse a cell (Date | serial number | string) into {date?: 'YYYY-MM-DD', time?: 'HH:mm'}. */
function parseDateTimeCell(cell: any): { date?: string; time?: string } {
  const out: { date?: string; time?: string } = {};
  try {
    if (cell instanceof Date && !isNaN(cell.getTime())) {
      out.date = cell.toISOString().split('T')[0];
      const h = cell.getUTCHours?.() ?? 0;
      const m = cell.getUTCMinutes?.() ?? 0;
      if (h || m) out.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return out;
    }
    if (typeof cell === 'number' && isFinite(cell)) {
      if (cell > 60) out.date = new Date(excelSerialToMs(cell)).toISOString().split('T')[0];
      else if (cell > 0 && cell < 1) {
        const mins = Math.round(cell * 1440);
        out.time = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      }
      return out;
    }
    const s = String(cell ?? '').trim();
    if (!s) return out;
    // Time-only strings
    const tm = s.match(/^(\d{1,2})[:.](\d{2})$/) || s.match(/^(\d{1,2})(\d{2})$/);
    if (tm) {
      const h = parseInt(tm[1], 10);
      const m = parseInt(tm[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) out.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return out;
    }
    // Datetime strings "2026-08-24 06:00"
    const dt = s.match(/(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})/);
    if (dt) { out.date = dt[1]; out.time = dt[2].padStart(5, '0'); return out; }
    // ISO
    const iso = s.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) { out.date = iso[0]; const t = s.match(/\d{1,2}:\d{2}/); if (t) out.time = t[0].padStart(5, '0'); return out; }
    // EU formats dd-mm-yyyy / dd/mm/yyyy / dd.mm.yyyy (also dd-mm-yy)
    const eu = s.match(/(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
    if (eu) {
      let d = parseInt(eu[1], 10);
      let mo = parseInt(eu[2], 10);
      let y = parseInt(eu[3], 10);
      if (y < 100) y += 2000;
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; } // US-style fallback
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y > 1990) {
        out.date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const t = s.match(/\d{1,2}:\d{2}/);
        if (t) out.time = t[0].padStart(5, '0');
      }
    }
  } catch { /* ignore malformed cells */ }
  return out;
}

export class SpreadsheetOrderParser {
  /** Parse a workbook buffer into trip objects compatible with TripScannerService.scanDocument. */
  static parse(buffer: Buffer): any[] {
    let rows: any[][];
    try {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      rows = [];
      for (const name of wb.SheetNames) {
        const sheetRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, raw: true, blankrows: false, defval: '' });
        rows.push(...sheetRows);
        rows.push([]); // sheet separator
      }
    } catch {
      return [];
    }
    if (!rows.length) return [];

    // ---- 1. Find the header row (best synonym match score within first 20 rows) ----
    let headerRowIdx = -1;
    let bestScore = 0;
    const limit = Math.min(rows.length, 20);
    for (let i = 0; i < limit; i++) {
      const score = (rows[i] || []).reduce((acc: number, cell: any) => {
        const n = norm(cell);
        return acc + (n && FIELD_SYNONYMS.some(([, syns]) => syns.some(s => n === s || n.includes(s))) ? 1 : 0);
      }, 0);
      if (score > bestScore) { bestScore = score; headerRowIdx = i; }
    }
    if (headerRowIdx === -1 || bestScore < 2) return [];

    // ---- 2. Map columns ----
    const colField: Record<number, string> = {};
    const headersNorm: Record<number, string> = {};
    const claimedFields = new Set<string>();
    const headerCells = rows[headerRowIdx] || [];
    headerCells.forEach((cell, idx) => {
      const n = norm(cell);
      if (!n) return;
      headersNorm[idx] = n;
      for (const [field, syns] of FIELD_SYNONYMS) {
        if (claimedFields.has(field)) continue;
        if (syns.some(s => n === s || n.includes(s))) {
          colField[idx] = field;
          claimedFields.add(field);
          break;
        }
      }
    });
    if (!Object.keys(colField).length) return [];

    const get = (row: any[], field: string): any => {
      for (const [idx, f] of Object.entries(colField)) {
        if (f === field) {
          const v = row[Number(idx)];
          if (v !== '' && v !== null && v !== undefined) return v;
        }
      }
      return undefined;
    };
    const str = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());
    const num = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const s = String(v).replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };
    // Weight cells may carry units ("8,5 t", "1.234 kg") -> normalize to kilograms
    const weightKg = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const raw = String(v).toLowerCase();
      const n = num(v);
      if (n === null) return null;
      if (/\d\s*(t|to|ton|tons|tonnen)\b/.test(raw) && !raw.includes('kg')) return Math.round(n * 1000);
      // Thousands separator without decimals: "1.234" or "1.234,5"
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(String(v).replace(/\s/g, ''))) return Math.round(parseFloat(String(v).replace(/\s|\./g, '').replace(',', '.')));
      return n;
    };

    // ---- 3. Data rows -> trips ----
    const trips: any[] = [];
    const mappedIdx = new Set(Object.keys(colField).map(Number));
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length || row.every(c => c === '' || c === null || c === undefined)) continue;

      // Skip separator / repeated header / totals rows
      const firstCellNorm = norm(row.find((c: any) => str(c) !== '') ?? '');
      if (!firstCellNorm) continue;
      if (TOTAL_ROW_WORDS.some(w => firstCellNorm.startsWith(w))) continue;

      const pDt = parseDateTimeCell(get(row, 'pickupDate'));
      const pTm = parseDateTimeCell(get(row, 'pickupTime'));
      const dDt = parseDateTimeCell(get(row, 'dropoffDate'));
      const dTm = parseDateTimeCell(get(row, 'dropoffTime'));

      // Assemble addresses (combined column wins; else street/postal/city/country style content flows to notes)
      const pickupAddrRaw = str(get(row, 'pickupAddress'));
      const dropoffAddrRaw = str(get(row, 'dropoffAddress'));

      const loadingReference = str(get(row, 'loadingReference')) || null;
      const unloadingReference = str(get(row, 'unloadingReference')) || null;
      const customerReference = str(get(row, 'customerReference')) || null;

      // Shipment-row validation: needs an operational anchor, not just weights
      const hasAnchor = !!(pDt.date || pTm.time || dDt.date || dTm.time || loadingReference || unloadingReference || pickupAddrRaw || dropoffAddrRaw ||
        str(get(row, 'pickupCompanyName')) || str(get(row, 'dropoffCompanyName')));
      if (!hasAnchor) continue;

      const weight = weightKg(get(row, 'weightKg'));
      const pallets = num(get(row, 'pallets'));

      // ---- Preserve EVERY unmapped column in notes ----
      const extraBits: string[] = [];
      for (const [idxStr, hNorm] of Object.entries(headersNorm)) {
        const idx = Number(idxStr);
        if (mappedIdx.has(idx)) continue;
        const v = str(row[idx]);
        if (!v) continue;
        // Original header casing looks better than normalized
        const origHeader = str(headerCells[idx]) || hNorm;
        extraBits.push(`${origHeader}: ${v}`);
      }

      const notesParts: string[] = [];
      const mappedNotes = str(get(row, 'notes'));
      if (mappedNotes) notesParts.push(mappedNotes);
      if (extraBits.length) notesParts.push(extraBits.join('; '));
      const notes = notesParts.join(' | ') || null;

      const trip: any = {
        pickupCompanyName: str(get(row, 'pickupCompanyName')) || null,
        pickupAddress: pickupAddrRaw || null,
        dropoffCompanyName: str(get(row, 'dropoffCompanyName')) || null,
        dropoffAddress: dropoffAddrRaw || null,
        pickupDate: pDt.date || null,
        dropoffDate: dDt.date || null,
        pickupTime: pTm.time || pDt.time || null,
        dropoffTime: dTm.time || dDt.time || null,
        price: num(get(row, 'price')),
        currency: str(get(row, 'currency')).toUpperCase() || null,
        weightKg: weight,
        pallets: pallets,
        volumeCbm: num(get(row, 'volumeCbm')),
        distanceKm: num(get(row, 'distanceKm')),
        loadingReference,
        unloadingReference,
        customerReference,
        contactPerson: str(get(row, 'contactPerson')) || null,
        contactPhone: str(get(row, 'contactPhone')) || null,
        notes,
        clientName: str(get(row, 'clientName')) || null,
        clientVatNumber: null,
        clientAddress: null,
        clientEmail: null,
        clientPhone: null,
      };

      // Deterministic chronology safety net (same as scanner.validateTrip)
      const p = trip.pickupDate ? new Date(`${trip.pickupDate}T${trip.pickupTime || '00:00'}:00Z`).getTime() : NaN;
      const d = trip.dropoffDate ? new Date(`${trip.dropoffDate}T${trip.dropoffTime || '00:00'}:00Z`).getTime() : NaN;
      if (!isNaN(p) && !isNaN(d) && d < p) {
        const pd = trip.pickupDate; const pt = trip.pickupTime;
        trip.pickupDate = trip.dropoffDate; trip.pickupTime = trip.dropoffTime;
        trip.dropoffDate = pd; trip.dropoffTime = pt;
      }

      trips.push(trip);
    }
    return trips;
  }
}
