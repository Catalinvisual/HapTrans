import * as XLSX from 'xlsx';

/**
 * Deterministic spreadsheet -> trips parser.
 *
 * Replaces the LLM for .xlsx/.xls/.csv imports: instant, free and 100%
 * reproducible. Columns are mapped through a curated multilingual synonym
 * dictionary we control. Designed for real client files like Koopman's
 * outbound planning sheets where:
 *  - the destination block uses generic Dutch headers (Naam/Adres/Postcode/
 *    Woonplaats/Ln I2) -> assembled into the delivery stop,
 *  - pallets are split over several columns (Pal Euro/Pal Blok/Pal Ovrg),
 *  - free-text columns (Faktuur info) hide the loading site ("Laden in
 *    Vijn Echt") which we mine with targeted regexes,
 *  - everything WITHOUT a dedicated system field lands verbatim in notes
 *    ("Header: value") — nothing is ever lost, nothing floods notes that
 *      has a real input.
 */

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface FieldDef {
  field: string;
  syns: string[];
  /** multiple columns may feed one field (values summed) */
  multi?: boolean;
}

/** Field claim priority: most specific first (klantreferentie before klant, etc.). */
const FIELDS: FieldDef[] = [
  // ---- references (very specific headers first) ----
  { field: 'loadingReference', syns: ['vracht auto nr', 'vracht autonr', 'vracht nummer', 'vrachtnummer', 'vracht nr', 'load nr', 'load number', 'load ref', 'loading ref', 'loading reference', 'ref laden', 'laad ref', 'cmr nr', 'cmr nummer', 'cmr', 'nr vracht'] },
  { field: 'customerReference', syns: ['cp order nr', 'cp ordernr', 'cp ord nummer', 'cp ordernummer', 'cp order', 'cp nummer', 'klantreferentie', 'klant referentie', 'customer order nr', 'customer ref', 'customer reference', 'uw referentie', 'purchase order', 'po nr', 'po number', 'commission nr', 'your ref'] },
  { field: 'unloadingReference', syns: ['unloading ref', 'unloading reference', 'lossen ref', 'los ref', 'ref lossen', 'aflever nr', 'aflevernummer', 'unload ref', 'slot id', 'slot nr', 'slot'] },
  // ---- dates & times ----
  { field: 'pickupDate', syns: ['laaddatum', 'laad datum', 'datum laden', 'loading date', 'load date', 'pickup date', 'date of loading', 'chargement date', 'date chargement', 'verlade datum', 'ladedatum', 'data incarcarii', 'data incarcare', 'gepl af magazijn', 'gepland af magazijn', 'datum af magazijn', 'af magazijn'] },
  { field: 'pickupTime', syns: ['tijd af magazijn', 'tijd op magazijn', 'tijd magazijn', 'magazijn tijd', 'laadtijd', 'laad tijd', 'tijd van laden', 'uur van laden', 'loading time', 'load time', 'pickup time', 'ladezeit', 'ora incarcarii'] },
  { field: 'dropoffDate', syns: ['lossdatum', 'loss datum', 'losdatum', 'los datum', 'datum lossen', 'delivery date', 'unload date', 'unloading date', 'aflever datum', 'afleverdatum', 'entlade datum', 'entladedatum', 'dechargement', 'date de livraison', 'data livrarii', 'data livrare', 'drop off date', 'dropoff date', 'geplande leverdatum', 'leverdatum', 'lever datum', 'geplande afleverdatum'] },
  { field: 'dropoffTime', syns: ['lostijd', 'los tijd', 'tijd van lossen', 'unload time', 'unloading time', 'delivery time', 'loszeit', 'ora livrarii', 'levertijd', 'lever tijd'] },
  // ---- combined addresses (explicit loading/unloading blocks) ----
  { field: 'pickupAddress', syns: ['laadadres', 'laad adres', 'laad locatie', 'laadlocatie', 'loading address', 'loading location', 'pickup address', 'pickup location', 'afhaal adres', 'place of loading', 'adres incarcare'] },
  { field: 'dropoffAddress', syns: ['losadres', 'los adres', 'los locatie', 'loslocatie', 'lossing adres', 'unloading address', 'unloading location', 'delivery address', 'delivery location', 'aflever adres', 'afleverlocatie', 'place of delivery', 'adres livrare'] },
  // ---- address PARTS (generic Dutch/German/French header blocks) ----
  { field: 'pickupStreet', syns: ['laad straat', 'straat laden', 'loading street'] },
  { field: 'pickupPostal', syns: ['laad postcode', 'postcode laden', 'loading postal code', 'loading zip'] },
  { field: 'pickupCity', syns: ['laad plaats', 'laadplaats', 'plaats laden', 'loading city', 'loading town'] },
  { field: 'pickupCountry', syns: ['laad land', 'land laden', 'loading country'] },
  { field: 'dropoffStreet', syns: ['adres', 'straat', 'street', 'strasse', 'rue'] },
  { field: 'dropoffPostal', syns: ['postcode', 'post code', 'postal code', 'zip code', 'plz'] },
  { field: 'dropoffCity', syns: ['woonplaats', 'plaats', 'stad', 'city', 'town', 'ort'] },
  { field: 'dropoffCountry', syns: ['ln i2', 'land', 'landcode', 'country', 'pais', 'pays'] },
  // ---- company names ----
  { field: 'pickupCompanyName', syns: ['naam laden', 'laden bij', 'laden door', 'loading company', 'loader name', 'shipper name', 'shipper', 'verlader', 'expediteur', 'nume incarcator'] },
  { field: 'dropoffCompanyName', syns: ['naam lossen', 'lossen bij', 'lossen aan', 'afleveren aan', 'delivery company', 'consignee name', 'consignee', 'ontvanger', 'destinatar', 'naam'] },
  // ---- cargo (multi-column sums) ----
  { field: 'weightKg', syns: ['gewicht kg', 'gewicht', 'weight kg', 'weight', 'bruto gewicht', 'brutogewicht', 'brutto gewicht', 'netto gewicht', 'brutto', 'bruto', 'poids', 'waga'], multi: true },
  { field: 'pallets', syns: ['aantal paletten', 'paletten', 'palets', 'palet', 'pallet qty', 'qty pallets', 'pallets', 'pal euro', 'pal blok', 'pal ovrg', 'epal'], multi: true },
  { field: 'volumeCbm', syns: ['volume m3', 'volume cbm', 'volume in m3', 'm3', 'cbm', 'volumen', 'volume'], multi: true },
  // ---- commercial ----
  { field: 'price', syns: ['prijs', 'price', 'rate', 'tarief', 'fracht', 'freight cost', 'freight'] },
  { field: 'currency', syns: ['valuta', 'currency', 'munt', 'devise'] },
  { field: 'distanceKm', syns: ['afstand km', 'afstand', 'distance km', 'distance', 'km stand'] },
  { field: 'contactPerson', syns: ['contact persoon', 'contactpersoon', 'contact person', 'contact name', 'att'] },
  { field: 'contactPhone', syns: ['telefoon nr', 'telefoonnummer', 'telefoon nummer', 'telefoon', 'telefon', 'phone', 'tel nr', 'tel', 'gsm', 'mobile'] },
  { field: 'notes', syns: ['opmerking', 'opmerkingen', 'remarks', 'remark', 'note', 'notes', 'notitie', 'notities', 'bemerkung', 'bemerkungen', 'instructie', 'instructies', 'instructions', 'observatii'] },
  { field: 'clientName', syns: ['opdrachtgever', 'opdracht gever', 'klant', 'customer name', 'customer', 'client name', 'client', 'auftraggeber', 'zleceniodawca'] },
];

const TOTAL_ROW_WORDS = ['totaal', 'totaalregels', 'subtotaal', 'total', 'subtotal', 'sum', 'somme'];
/** headers that must NEVER be read as pallet counts */
const PALLET_BLACKLIST = ['colli', 'colli aantal', 'aantal colli'];

const ISO_COUNTRY: Record<string, string> = {
  nl: 'Netherlands', be: 'Belgium', de: 'Germany', fr: 'France', pl: 'Poland',
  es: 'Spain', it: 'Italy', gb: 'United Kingdom', uk: 'United Kingdom', at: 'Austria',
  ch: 'Switzerland', lu: 'Luxembourg', dk: 'Denmark', se: 'Sweden', no: 'Norway',
  fi: 'Finland', pt: 'Portugal', cz: 'Czechia', sk: 'Slovakia', hu: 'Hungary', ro: 'Romania', bg: 'Bulgaria',
};

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function excelSerialToMs(serial: number): number {
  return EXCEL_EPOCH_UTC + Math.round(serial * 86400 * 1000);
}

function parseDateTimeCell(cell: any): { date?: string; time?: string } {
  const out: { date?: string; time?: string } = {};
  try {
    if (cell instanceof Date && !isNaN(cell.getTime())) {
      out.date = cell.toISOString().split('T')[0];
      const h = cell.getUTCHours?.() ?? 0;
      const m = cell.getUTCMinutes?.() ?? 0;
      const sec = cell.getUTCSeconds?.() ?? 0;
      if (h || m || sec) out.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
    // Time strings incl. seconds: 07:01:00
    const tm = s.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);
    if (tm) {
      const h = parseInt(tm[1], 10);
      const m = parseInt(tm[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) out.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return out;
    }
    // Datetime "2026-08-24 06:00"
    const dt = s.match(/(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})/);
    if (dt) { out.date = dt[1]; out.time = dt[2].padStart(5, '0'); return out; }
    const iso = s.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) { out.date = iso[0]; const t = s.match(/\d{1,2}:\d{2}/); if (t) out.time = t[0].padStart(5, '0'); return out; }
    // EU formats
    const eu = s.match(/(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
    if (eu) {
      let d = parseInt(eu[1], 10);
      let mo = parseInt(eu[2], 10);
      let y = parseInt(eu[3], 10);
      if (y < 100) y += 2000;
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y > 1990) {
        out.date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const t = s.match(/\d{1,2}:\d{2}/);
        if (t) out.time = t[0].padStart(5, '0');
      }
    }
  } catch { /* ignore malformed cells */ }
  return out;
}

/** Mine free-text cells for a loading site: "…om 06:00 - Laden in Vijn Echt PO …" */
function extractLoadingSite(text: string): string | null {
  const m = text.match(/(?:laden\s+in|loading\s+at|verlading(?:slocatie)?\s*:?)\s*[:\-]?\s+([A-Za-z0-9@&.\'\- ]{2,60}?)(?=\s+\b(?:PO\b|ID\b|REF\b|$)|[;,]|$)/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() || null : null;
}

export class SpreadsheetOrderParser {
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

    // ---- 1. Header row = best synonym score within first 20 rows ----
    let headerRowIdx = -1;
    let bestScore = 0;
    const limit = Math.min(rows.length, 20);
    for (let i = 0; i < limit; i++) {
      const score = (rows[i] || []).reduce((acc: number, cell: any) => {
        const n = norm(cell);
        return acc + (n && FIELDS.some(f => f.syns.some(s => n === s || n.includes(s))) ? 1 : 0);
      }, 0);
      if (score > bestScore) { bestScore = score; headerRowIdx = i; }
    }
    if (headerRowIdx === -1 || bestScore < 2) return [];

    // ---- 2. Claim columns: BEST (longest) synonym wins per header ----
    const colsByField: Record<string, number[]> = {};
    const fieldByCol: Record<number, string> = {};
    const headersNorm: Record<number, string> = {};
    const headerCells = rows[headerRowIdx] || [];
    headerCells.forEach((cell, idx) => {
      const n = norm(cell);
      if (!n) return;
      headersNorm[idx] = n;
      let bestDef: FieldDef | null = null;
      let bestLen = 0;
      for (const def of FIELDS) {
        for (const s of def.syns) {
          if ((n === s || n.includes(s)) && s.length > bestLen) {
            bestLen = s.length;
            bestDef = def;
          }
        }
      }
      if (!bestDef) return;
      if (bestDef.multi || !colsByField[bestDef.field]?.length) {
        (colsByField[bestDef.field] ||= []).push(idx);
        fieldByCol[idx] = bestDef.field;
      }
    });
    if (!Object.keys(colsByField).length) return [];

    const firstVal = (row: any[], field: string): any => {
      for (const idx of colsByField[field] || []) {
        const v = row[idx];
        if (v !== '' && v !== null && v !== undefined) return v;
      }
      return undefined;
    };
    const str = (v: any): string => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());
    const num = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const s = String(v).replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };
    const sumField = (row: any[], field: string): number | null => {
      let total: number | null = null;
      for (const idx of colsByField[field] || []) {
        const n = num(row[idx]);
        if (n !== null) total = (total ?? 0) + n;
      }
      return total;
    };
    const weightKg = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const raw = String(v).toLowerCase();
      const n = num(v);
      if (n === null) return null;
      if (/\d\s*(t|to|ton|tons|tonnen)\b/.test(raw) && !raw.includes('kg')) return Math.round(n * 1000);
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(String(v).replace(/\s/g, ''))) return Math.round(parseFloat(String(v).replace(/\s|\./g, '').replace(',', '.')));
      return n;
    };
    const joinAddr = (...parts: Array<string | null | undefined>): string | null =>
      parts.map(p => (p || '').trim()).filter(Boolean).join(', ') || null;

    // ---- 3. Data rows -> trips ----
    const trips: any[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length || row.every(c => c === '' || c === null || c === undefined)) continue;

      const firstCellNorm = norm(row.find((c: any) => str(c) !== '') ?? '');
      if (!firstCellNorm) continue;
      if (TOTAL_ROW_WORDS.some(w => firstCellNorm.startsWith(w))) continue;

      const pDt = parseDateTimeCell(firstVal(row, 'pickupDate'));
      const pTm = parseDateTimeCell(firstVal(row, 'pickupTime'));
      const dDt = parseDateTimeCell(firstVal(row, 'dropoffDate'));
      const dTm = parseDateTimeCell(firstVal(row, 'dropoffTime'));

      // Assemble addresses from dedicated blocks or generic part columns
      const pickupAddress = joinAddr(
        str(firstVal(row, 'pickupAddress')) || null,
        (() => { const a = joinAddr(str(firstVal(row, 'pickupStreet')), [str(firstVal(row, 'pickupPostal')), str(firstVal(row, 'pickupCity'))].filter(Boolean).join(' '), str(firstVal(row, 'pickupCountry'))); return a; })(),
      );
      const dropoffAddress = joinAddr(
        str(firstVal(row, 'dropoffAddress')) || null,
        joinAddr(str(firstVal(row, 'dropoffStreet')), [str(firstVal(row, 'dropoffPostal')), str(firstVal(row, 'dropoffCity'))].filter(Boolean).join(' '), ISO_COUNTRY[str(firstVal(row, 'dropoffCountry')).toLowerCase()] || str(firstVal(row, 'dropoffCountry')) || null),
      );

      const loadingReference = str(firstVal(row, 'loadingReference')) || null;
      const unloadingReference = str(firstVal(row, 'unloadingReference')) || null;
      const customerReference = str(firstVal(row, 'customerReference')) || null;

      const hasAnchor = !!(pDt.date || pTm.time || dDt.date || dTm.time || loadingReference || unloadingReference || pickupAddress || dropoffAddress ||
        str(firstVal(row, 'pickupCompanyName')) || str(firstVal(row, 'dropoffCompanyName')));
      if (!hasAnchor) continue;

      // Cargo: pallets summed over Pal Euro/Pal Blok/Pal Ovrg style columns
      let pallets = sumField(row, 'pallets');
      const weight = weightKg(firstVal(row, 'weightKg')) ?? (colsByField['weightKg'] ? sumField(row, 'weightKg') : null);

      // ---- Notes = ONLY columns without a dedicated system field ----
      const extraBits: string[] = [];
      for (const [idxStr, hNorm] of Object.entries(headersNorm)) {
        const idx = Number(idxStr);
        if (fieldByCol[idx]) continue;
        const v = str(row[idx]);
        if (!v) continue;
        extraBits.push(`${str(headerCells[idx]) || hNorm}: ${v}`);
      }

      const notesParts: string[] = [];
      const mappedNotes = str(firstVal(row, 'notes'));
      if (mappedNotes) notesParts.push(mappedNotes);
      if (extraBits.length) notesParts.push(extraBits.join('; '));
      let notes = notesParts.join(' | ') || null;
      let pickupCompanyName = str(firstVal(row, 'pickupCompanyName')) || null;
      let finalPickupAddress = pickupAddress;
      const freeText = extraBits.join('; ');
      if ((!finalPickupAddress && !pickupCompanyName) && freeText) {
        const site = extractLoadingSite(freeText);
        if (site) {
          finalPickupAddress = site;
          pickupCompanyName = site.split(/[ ,]/)[0] || site;
        }
      }

      const trip: any = {
        pickupCompanyName,
        pickupAddress: finalPickupAddress,
        dropoffCompanyName: str(firstVal(row, 'dropoffCompanyName')) || null,
        dropoffAddress: dropoffAddress,
        pickupDate: pDt.date || null,
        dropoffDate: dDt.date || null,
        pickupTime: pTm.time || pDt.time || null,
        dropoffTime: dTm.time || dDt.time || null,
        price: num(firstVal(row, 'price')),
        currency: str(firstVal(row, 'currency')).toUpperCase() || null,
        weightKg: weight,
        pallets: pallets != null && pallets > 0 ? pallets : null,
        volumeCbm: sumField(row, 'volumeCbm'),
        distanceKm: num(firstVal(row, 'distanceKm')),
        loadingReference,
        unloadingReference,
        customerReference,
        contactPerson: str(firstVal(row, 'contactPerson')) || null,
        contactPhone: str(firstVal(row, 'contactPhone')) || null,
        notes,
        clientName: str(firstVal(row, 'clientName')) || null,
        clientVatNumber: null,
        clientAddress: null,
        clientEmail: null,
        clientPhone: null,
      };

      // NOTE: no chronology swapping here. Columns are explicit; if a client's
      // file contains contradictory dates (e.g. Koopman's leverdatum before
      // af magazijn) we show them faithfully instead of scrambling fields.
      trips.push(trip);
    }
    return trips;
  }
}
