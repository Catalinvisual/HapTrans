import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as XLSX from 'xlsx';
import { SpreadsheetOrderParser } from './spreadsheet-order-parser';

const EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msexcel',
  'application/xlsx',
  'text/csv',
  'application/csv',
  'text/plain',
];

function isSpreadsheet(mimeType?: string, filename?: string): boolean {
  const mt = (mimeType || '').toLowerCase();
  if (EXCEL_MIMES.includes(mt)) return true;
  const ext = (filename || '').toLowerCase().split('.').pop();
  return ['xlsx', 'xls', 'csv'].includes(ext || '');
}

@Injectable()
export class TripScannerService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Converts an Excel workbook (.xlsx/.xls/.csv) into clean, AI-readable text.
   * Every worksheet is rendered as a CSV block so the model sees rows/columns verbatim.
   */
  private spreadsheetToText(buffer: Buffer): string {
    try {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const blocks: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false }).trim();
        if (csv) {
          blocks.push(`### SHEET: "${sheetName}" ###\n${csv}`);
        }
      }
      return blocks.join('\n\n') || '(The spreadsheet is empty)';
    } catch (e: any) {
      throw new Error(`Could not read the spreadsheet file: ${e.message}`);
    }
  }

  /** Response schema shared by extraction AND verification passes. */
  private buildResponseSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        trips: {
          type: SchemaType.ARRAY,
          description: "One entry for EACH transport order / trip found in the document. Single-order documents still get exactly one entry.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              pickupCompanyName: { type: SchemaType.STRING, description: "Company name where cargo is loaded, EXACTLY as written in the document (verbatim). Do not expand or substitute from your own knowledge — many companies have multiple sites." },
              pickupAddress: { type: SchemaType.STRING, description: "Loading address EXACTLY as in the document, postal codes normalized (e.g. '43-150 Bieruń, Poland'). If only company+city is given, output just that ('Company, City, Country') — never invent a street or a different city." },
              dropoffCompanyName: { type: SchemaType.STRING, description: "Company name where cargo is delivered, EXACTLY as written in the document (verbatim). No expansion/substitution from knowledge." },
              dropoffAddress: { type: SchemaType.STRING, description: "Delivery address EXACTLY as in the document. If only company+city given, output just that — never invent a street or a different city." },
              pickupDate: { type: SchemaType.STRING, description: "LOADING date in YYYY-MM-DD. Source labels: Laden/Laaddatum/Chargement/Loading/Pickup/Verladung/Abholung. NEVER put the delivery/unloading date here." },
              dropoffDate: { type: SchemaType.STRING, description: "DELIVERY/UNLOADING date in YYYY-MM-DD. Source labels: Lossen/Losdatum/Déchargement/Afladen/Entladung/Livrare/Delivery. CRITICAL: if the document contains ANY delivery date, this field MUST be filled — never leave it empty while pickupDate is set." },
              pickupTime: { type: SchemaType.STRING, description: "LOADING time HH:mm. From the same row/label as the loading date (e.g. 'Laden om 15:30'). Split datetime values: date -> pickupDate, time -> pickupTime." },
              dropoffTime: { type: SchemaType.STRING, description: "DELIVERY time HH:mm. From the same row/label as the delivery date. Split datetime values: date -> dropoffDate, time -> dropoffTime." },
              price: { type: SchemaType.NUMBER, description: "The freight price/rate for THIS trip in EUR (convert other currencies to EUR if stated)." },
              currency: { type: SchemaType.STRING, description: "Currency code of the price as stated in the document (EUR, USD, PLN...). Default EUR." },
              weightKg: { type: SchemaType.NUMBER, description: "Total cargo weight strictly in KILOGRAMS for THIS trip. NEVER copy pallets/cartons count here. Tons convert to kg." },
              pallets: { type: SchemaType.NUMBER, description: "Number of PALLETS for THIS trip. NEVER confuse with weight/volume/cartons. Keywords: palets, pallets, EPAL, pal, colli." },
              palletType: { type: SchemaType.STRING, description: "Type of pallets (e.g. 'Euro', 'Block')." },
              volumeCbm: { type: SchemaType.NUMBER, description: "Volume strictly in cubic meters. Keywords: cbm, m3." },
              distanceKm: { type: SchemaType.NUMBER, description: "Route distance in km ONLY if explicitly stated in the document." },
              loadingReference: { type: SchemaType.STRING, description: "THE REFERENCE USED AT THE LOADING SITE. In spreadsheets this is often a column named: vracht auto nr / vrachtnummer / load nr / loading nr / ref laden / CMR nr / order nr van de vracht. It identifies the physical shipment being picked up. NOT the customer's own order number unless clearly the same thing." },
              unloadingReference: { type: SchemaType.STRING, description: "THE REFERENCE USED AT THE DELIVERY SITE: lossen ref / unloading ref / delivery ref / slot ID / aflevernummer. DO NOT copy loadingReference here unless stated it applies to both." },
              customerReference: { type: SchemaType.STRING, description: "The CLIENT'S own order/booking number: cp order nr / customer PO / klantreferentie / uw referentie / commission nr. This belongs to the commercial relationship, not the warehouse operation." },
              contactPerson: { type: SchemaType.STRING, description: "Contact person name at the client/dispatch if present." },
              contactPhone: { type: SchemaType.STRING, description: "Contact phone number if present." },
              notes: { type: SchemaType.STRING, description: "ALL remaining document information with no dedicated field: invoice/factuur details, account numbers, extra PO numbers, IDs, pallet exchange rules, Incoterms (DDP/DAP), special instructions. Separated by '; '. Never drop information." },
              clientName: { type: SchemaType.STRING, description: "THE CLIENT = the company that ORDERED/pays for the transport: letterhead/logo, sender email domain, or labeled Customer/Klant/Auftraggeber/Opdrachtgever/Zleceniodawca. Often DIFFERENT from shipper and consignee. If undeterminable, use the shipper company name." },
              clientVatNumber: { type: SchemaType.STRING, description: "VAT/Tax number of THE CLIENT (VAT, BTW, USt, MwSt, NIP, CIF, UID). Without spaces." },
              clientAddress: { type: SchemaType.STRING, description: "Registered office address of THE CLIENT (not warehouse address), if present." },
              clientEmail: { type: SchemaType.STRING, description: "Email of THE CLIENT if present." },
              clientPhone: { type: SchemaType.STRING, description: "Phone of THE CLIENT if present." }
            }
          }
        }
      }
    };
  }

  private buildExtractionPrompt(): string {
    return `
You are an expert transport logistics AI. Read the attached shipping order(s), CMR, delivery note, rate confirmation or SPREADSHEET.
Extract ALL data perfectly into the requested JSON schema.

MULTI-TRIP DETECTION (CRITICAL):
1. One document can contain MULTIPLE transport orders/trips:
   - In spreadsheets: EACH DATA ROW that represents a shipment/load IS ONE TRIP. Column headers define the fields. Do NOT merge rows; do NOT treat totals rows as trips.
   - In PDFs/images: multiple pages, sections, tables or numbered orders = separate trips. Group fields per section carefully.
2. If the document clearly contains only ONE order, return exactly ONE trip entry.
3. Each trip must carry ITS OWN references, dates, addresses, cargo data and price. Never mix values between different trips.

DATE/TIME ASSIGNMENT (MOST COMMON FATAL ERROR — ZERO TOLERANCE):
4. Loading happens BEFORE delivery, always. Labels map strictly:
   - LOADING side: Laden, Laaddatum, Chargement, Loading, Pickup, Verladung, Abholung, Incarcare
   - DELIVERY side: Lossen, Losdatum, Afladen, Entladung, Déchargement, Livrare, Unloading, Delivery
5. pickupDate/pickupTime come ONLY from the LOADING labels; dropoffDate/dropoffTime come ONLY from the DELIVERY labels.
6. If a cell contains datetime (e.g. "2026-08-24 06:00"), split it: date part -> date field, time part -> time field.
7. NEVER leave dropoffDate/dropoffTime empty when the document contains a delivery date/time. Every extracted trip MUST have pickup filled from loading labels and dropoff filled from delivery labels.
8. Final self-check per trip BEFORE answering: is dropoff >= pickup? Is each date under its own label's side?

REFERENCE INTELLIGENCE (CRITICAL FOR SPREADSHEETS):
9. Choose references by MEANING, not position:
   - loadingReference = number identifying the physical LOAD at pickup (column names like: vracht auto nr, vrachtnummer, load nr, ref laden, CMR nr)
   - unloadingReference = number used at delivery (unloading ref, lossen ref, slot ID, aflevernr)
   - customerReference = the client's commercial order number (cp order nr, klantreferentie, customer PO, your ref, commission nr)
10. Read the COLUMN HEADER, not just the first value. A "cp order nr" is the customer's order -> customerReference, NOT loadingReference. A "vracht auto nr" is the freight/load number -> loadingReference.

CLIENT IDENTIFICATION (CRITICAL):
11. THE CLIENT ordered/pays for the transport — usually in letterhead/logo, sender email domain, or labeled Customer/Klant/Auftraggeber/Opdrachtgever/Zleceniodawca. Shipper and consignee are frequently NOT the client.

COMPANY NAMES & ADDRESSES — DOCUMENT IS KING (CRITICAL):
12. Extract company names and addresses EXACTLY as written in the document. Copy them verbatim.
13. NEVER replace, expand, "correct" or complete a company name or location using your own world knowledge. Many companies operate multiple sites in different cities (e.g. Vijn has sites in Echt AND Roermond): guessing produces WRONG loading addresses and real financial damage. If the document says "Vijn, Echt", you MUST output Echt — never another branch city.
14. Only cosmetic normalization is allowed: postal code formatting ("1234 AB", "12-345"), adding the country name when obvious from context, fixing typos in street spellings while keeping the SAME location.
15. If the document gives ONLY company + city without a street: output exactly "Company, City, Country". Do NOT invent a street. A downstream geocoding service completes the precise address reliably.

TIME COLUMNS (CRITICAL FOR SPREADSHEETS/DOCS WITH SEPARATE TIME CELLS):
15b. Loading times often live in their OWN column, separate from the date — headers like "Tijd af magazijn", "Tijd op magazijn", "Laadtijd", "Loading time". Read EVERY column header carefully and map it by MEANING: warehouse departure/loading time -> pickupTime; unloading/delivery time -> dropoffTime. Never leave pickupTime empty when such a column exists.

NOTES COMPLETENESS (NEVER LOSE INFORMATION):
20. The notes field MUST capture ALL remaining document information that has no dedicated field: invoice/factuur details, account numbers (e.g. "KOOPMAN PAKI ACCOUNT 030533"), PO numbers beyond customerReference, IDs, pallet-exchange rules ("NO PALLET EXCHANGE"), Incoterms ("Delivered Duty Paid"), special instructions, temperature requirements, ADR class, equipment requests. Concatenate them separated by "; ". NOTHING from the document may be dropped.

DETERMINISM & ACCURACY:
16. Extract exact literal values. Never fabricate. Unknown field => leave empty/null.
17. WEIGHT vs PALLETS: weightKg in kg ("Gewicht", "brutto"); pallets is count ("palet", "EPAL"). "24 t" -> 24000 kg.
18. Dates YYYY-MM-DD, times HH:mm 24h.
19. Inspect EVERY sheet in multi-sheet workbooks.
`;
  }

  /**
   * Full scan: returns EVERY trip found in the document (PDF, image, Excel, CSV).
   * Runs an extraction pass (Pro, fallback Flash) followed by a VERIFICATION
   * pass where the model re-reads the document alongside its own JSON and
   * fixes misassignments (swapped dates, lost dropoff, wrong reference column).
   */
  async scanDocument(buffer: Buffer, originalMimeType: string, filename?: string): Promise<{ trips: any[] }> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const spreadsheet = isSpreadsheet(originalMimeType, filename);

    // ---- HYBRID PATH for spreadsheets ----
    // 1. Deterministic parser builds a consistent skeleton (instant).
    // 2. An AI audit pass then fixes field assignments SEMANTICALLY against
    //    the raw sheet text, so ANY client-specific layout works — not just
    //    headers our dictionary knows.
    let documentPart: any;
    if (spreadsheet) {
      const sheetText = this.spreadsheetToText(buffer);
      const parsedTrips = SpreadsheetOrderParser.parse(buffer);
      if (parsedTrips.length > 0) {
        let trips = parsedTrips;
        try {
          trips = await this.refineTripsWithAI(sheetText, parsedTrips);
        } catch (e: any) {
          console.warn('[trip-scanner] AI refinement skipped:', e?.message);
        }
        return { trips: trips.map(t => this.validateTrip(t)) };
      }
      // Unrecognized layout -> full LLM extraction on the text below.
      documentPart = { text: `\n===== SPREADSHEET CONTENT START =====\n${sheetText}\n===== SPREADSHEET CONTENT END =====` };
    } else {
      let mimeType = originalMimeType || 'image/jpeg';
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      if (mimeType.includes('pdf')) mimeType = 'application/pdf';
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        mimeType = 'image/jpeg'; // fallback
      }
      documentPart = { inlineData: { data: buffer.toString('base64'), mimeType } };
    }

    const request = {
      contents: [{ role: 'user', parts: [{ text: this.buildExtractionPrompt() }, documentPart] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        responseSchema: this.buildResponseSchema(),
      } as any,
    };

    const firstPassText = await this.generateWithFallback(request);
    let trips: any[] = this.extractTrips(this.safeParse(firstPassText));

    // ---- VERIFICATION PASS (self-check against the source document) ----
    try {
      const verifyPrompt = `
You are auditing a colleague's data extraction against the ORIGINAL document (attached again below).
FIRST PASS RESULT (JSON):
${JSON.stringify({ trips })}

TASK — verify EVERY field of every trip directly against the document and return the CORRECTED full JSON in the exact same schema:
1. DATE SIDE CHECK: confirm each pickupDate/pickupTime comes from the LOADING label row (Laden/Laaddatum/Chargement...) and each dropoffDate/dropoffTime from the DELIVERY label row (Lossen/Losdatum/Déchargement...). Swap them if they were taken from the wrong side. Loading must be <= delivery.
2. MISSING DROP OFF: if dropoffDate/dropoffTime is empty but the document shows any delivery/unloading date/time, fill it from the document.
3. REFERENCES: check column headers. "vracht auto nr"/"load nr" style = loadingReference. "cp order nr"/"klantreferentie"/customer PO = customerReference. Unloading/slot numbers = unloadingReference. Move values to the correct fields.
4. COMPANY NAMES/ADDRESSES vs DOCUMENT: every name/address must match the document verbatim. If the first pass invented a street, expanded an abbreviation or moved the location to a DIFFERENT city/branch than the document states, revert it to exactly what the document says ('Company, City, Country'). Only postal-code formatting may be normalized.
5. Keep everything that is already correct identical. Never invent data not supported by the document.
Return ONLY the corrected JSON object with the "trips" array.`;
      const verifyRequest = {
        contents: [{
          role: 'user',
          parts: [
            { text: verifyPrompt },
            documentPart,
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          responseSchema: this.buildResponseSchema(),
        } as any,
      };
      const verifiedText = await this.generateWithFallback(verifyRequest);
      const verifiedTrips = this.extractTrips(this.safeParse(verifiedText));
      if (verifiedTrips.length > 0) {
        trips = verifiedTrips.length === trips.length
          ? verifiedTrips.map((v, i) => this.mergeTrip(trips[i], v))
          : verifiedTrips;
      }
    } catch (e: any) {
      console.warn('[trip-scanner] Verification pass failed, keeping first pass:', e?.message);
    }

    return { trips: trips.map(t => this.validateTrip(t)) };
  }

  /**
   * SEMANTIC AUDIT PASS for spreadsheet imports.
   * The deterministic parser guarantees speed and reproducibility, but it can
   * only map columns whose headers resemble known synonyms. This pass gives
   * Gemini the RAW sheet text plus the parser's JSON and lets it fix field
   * assignments by UNDERSTANDING the content — so any client's layout works,
   * not just the ones our dictionary covers.
   */
  private async refineTripsWithAI(sheetText: string, trips: any[]): Promise<any[]> {
    if (!this.genAI || !trips.length) return trips;
    const prompt = `
You are auditing a deterministic parser's output against the RAW spreadsheet text below.

===== RAW SPREADSHEET TEXT =====
${sheetText}
===== END RAW TEXT =====

PARSER OUTPUT (JSON):
${JSON.stringify({ trips })}

The parser maps columns via a fixed synonym dictionary, so client-specific header names may have been MISSED (values dumped into notes) or MISASSIGNED. Using the raw text — where the VALUES tell the truth more than the header names — return the corrected JSON:

1. FIELD ASSIGNMENT: verify every field of every trip against the raw row. Move any value currently stuck in notes into its proper dedicated field when one exists (company names, address parts incl. street/postal/city/country, loading/unloading/customer references, dates, times, weight, pallets, volume, price, contacts). A column may be meaningful even if its header is unknown — judge by its VALUES.
2. DATES & TIMES: loading must precede delivery. When planning columns contradict an explicit statement in a text cell (e.g. "29-08 om 06:00 - Laden in Vijn Echt"), the EXPLICIT statement wins for that side. Split combined datetime values into date + time fields.
3. COMPANY NAMES & ADDRESSES: expand abbreviated/coded company names to their official registered names and complete missing street/postal/city from knowledge of those specific companies/facilities. NEVER invent a different branch or city than the document indicates — when unsure keep the document value verbatim.
4. NOTES HYGIENE: remove from notes everything you moved into a real field; drop meaningless admin values (zero counters like "Waarvan col.divers: 0", duplicate counts like "Plt rmt" when pallets are already set); KEEP operationally important info (payment/rembours terms, account numbers, PO/ID numbers, Incoterms like DDP, special instructions, delivery-site info). Notes must read like concise dispatcher instructions: merge related fragments with "; ", target under ~400 characters.
Return ONLY the corrected {"trips":[...]} JSON, same schema, one entry per trip.`;
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0,
          responseSchema: this.buildResponseSchema(),
        } as any,
      });
      const parsed = this.safeParse(result.response.text());
      const refined = this.extractTrips(parsed);
      if (!refined.length) return trips;
      // Conservative merge: refined values win, but nothing non-empty is lost.
      return refined.length === trips.length ? refined.map((v, i) => this.mergeTrip(trips[i], v)) : refined;
    } catch (e) {
      console.warn('[trip-scanner] refineTripsWithAI failed, keeping parser output:', (e as any)?.message);
      return trips;
    }
  }

  /** Pro first; on any failure (quota etc.) retry with Flash. */
  private async generateWithFallback(request: any): Promise<string> {
    try {
      const modelPro = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await modelPro.generateContent(request);
      return result.response.text();
    } catch (error) {
      console.warn("gemini-2.5-pro failed (likely quota limit). Falling back to gemini-2.5-flash. Error: ", (error as any)?.message);
      const modelFlash = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const fallbackResult = await modelFlash.generateContent(request);
      return fallbackResult.response.text();
    }
  }

  private safeParse(text: string): any {
    try { return JSON.parse(text); } catch { return {}; }
  }

  private extractTrips(parsed: any): any[] {
    if (!parsed) return [];
    if (Array.isArray(parsed.trips)) return parsed.trips.filter(Boolean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.pickupCompanyName || parsed.dropoffAddress || parsed.loadingReference) return [parsed];
    return [];
  }

  /** Merge: corrected values win, but never lose a non-empty first-pass value. */
  private mergeTrip(first: any, verified: any): any {
    if (!first) return verified;
    const merged: any = { ...first };
    for (const key of Object.keys(verified)) {
      const v = verified[key];
      if (v !== null && v !== undefined && v !== '') {
        merged[key] = v;
      }
    }
    return merged;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(String(value).trim());
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Deterministic safety net: loading can never happen after delivery.
   * If violated, the sides were swapped -> exchange dates AND times.
   */
  private validateTrip(trip: any): any {
    if (!trip || typeof trip !== 'object') return trip;
    const p = this.parseDate(trip.pickupDate);
    const d = this.parseDate(trip.dropoffDate);
    if (p && d && d.getTime() < p.getTime()) {
      console.warn(
        `[trip-scanner] Chronology violation detected (pickup ${trip.pickupDate} > dropoff ${trip.dropoffDate}) — swapping pickup/dropoff dates & times.`
      );
      const pickupDate = trip.pickupDate;
      const pickupTime = trip.pickupTime;
      trip.pickupDate = trip.dropoffDate;
      trip.pickupTime = trip.dropoffTime;
      trip.dropoffDate = pickupDate;
      trip.dropoffTime = pickupTime;
    }
    return trip;
  }

  /**
   * LEGACY single-trip API (used by /trips/scan and /trips/import).
   * Returns the first trip found, keeping the old flat-object contract.
   */
  async scanTripDocument(buffer: Buffer, originalMimeType: string, filename?: string): Promise<any> {
    const { trips } = await this.scanDocument(buffer, originalMimeType, filename);
    return trips[0] || {};
  }
}
