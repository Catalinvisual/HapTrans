import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as XLSX from 'xlsx';

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

  /**
   * Full scan: returns EVERY trip found in the document (PDF, image, Excel, CSV).
   * A document with one order yields a single-element array.
   */
  async scanDocument(buffer: Buffer, originalMimeType: string, filename?: string): Promise<{ trips: any[] }> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const spreadsheet = isSpreadsheet(originalMimeType, filename);

    let documentPart: any;
    if (spreadsheet) {
      const text = this.spreadsheetToText(buffer);
      documentPart = { text: `\n===== SPREADSHEET CONTENT START =====\n${text}\n===== SPREADSHEET CONTENT END =====` };
    } else {
      let mimeType = originalMimeType || 'image/jpeg';
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      if (mimeType.includes('pdf')) mimeType = 'application/pdf';
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        mimeType = 'image/jpeg'; // fallback
      }
      documentPart = { inlineData: { data: buffer.toString('base64'), mimeType } };
    }

    const generationConfig = {
      responseMimeType: "application/json",
      temperature: 0,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          trips: {
            type: SchemaType.ARRAY,
            description: "One entry for EACH transport order / trip found in the document. Single-order documents still get exactly one entry.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                pickupCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is picked up/loaded." },
                pickupAddress: { type: SchemaType.STRING, description: "Full pickup/loading address. CRITICAL: Format it cleanly for geocoding (e.g. 'Street Name Number, Postal Code City, Country'). For countries like Poland, ensure the postal code has a hyphen (e.g. '43-150 Bieruń, Poland' instead of '43 150 BIERUN'). Extract ACTUAL loading place, not transporter's office." },
                dropoffCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is delivered/unloaded." },
                dropoffAddress: { type: SchemaType.STRING, description: "Full delivery/dropoff/unloading address. CRITICAL: Format it cleanly for geocoding (e.g. 'Street Name Number, Postal Code City, Country')." },
                pickupDate: { type: SchemaType.STRING, description: "Loading date in YYYY-MM-DD format" },
                dropoffDate: { type: SchemaType.STRING, description: "Delivery date in YYYY-MM-DD format" },
                pickupTime: { type: SchemaType.STRING, description: "Loading/pickup time in HH:mm format. Only fill if explicitly the loading/pickup time." },
                dropoffTime: { type: SchemaType.STRING, description: "Delivery/unloading time in HH:mm format. Only fill if explicitly the unloading/delivery time." },
                price: { type: SchemaType.NUMBER, description: "The freight price/rate for THIS trip in EUR (convert other currencies to EUR if stated)." },
                currency: { type: SchemaType.STRING, description: "Currency code of the price as stated in the document (EUR, USD, PLN...). Default EUR." },
                weightKg: { type: SchemaType.NUMBER, description: "Total cargo weight strictly in KILOGRAMS for THIS trip. NEVER copy pallets/cartons count here. Tons convert to kg." },
                pallets: { type: SchemaType.NUMBER, description: "Number of PALLETS for THIS trip. NEVER confuse with weight/volume/cartons. Keywords: palets, EPAL, pal, EUR-pallets." },
                palletType: { type: SchemaType.STRING, description: "Type of pallets (e.g. 'Euro', 'Block')." },
                volumeCbm: { type: SchemaType.NUMBER, description: "Volume strictly in cubic meters (CBM/m3). Keywords: cbm, m3." },
                distanceKm: { type: SchemaType.NUMBER, description: "Route distance in km ONLY if explicitly stated in the document." },
                loadingReference: { type: SchemaType.STRING, description: "Reference number specifically for pickup/loading of THIS trip, or the main order number (Auftrag, Order, Ref). Can be a short 6-digit number." },
                unloadingReference: { type: SchemaType.STRING, description: "Reference number specifically for delivery/unloading of THIS trip. DO NOT copy loadingReference here unless it applies to both." },
                customerReference: { type: SchemaType.STRING, description: "The customer's own reference for this shipment (customer ref, your ref, booking ref) if different from loading/unloading refs." },
                contactPerson: { type: SchemaType.STRING, description: "Contact person name at the client/dispatch if present." },
                contactPhone: { type: SchemaType.STRING, description: "Contact phone number if present." },
                notes: { type: SchemaType.STRING, description: "Important notes, special instructions, or cargo description for THIS trip." },
                clientName: { type: SchemaType.STRING, description: "THE CLIENT = the company that ORDERED/pays for the transport: usually in the letterhead, logo, sender email domain, or labeled Customer/Klant/Auftraggeber/Opdrachtgever/Zleceniodawca. This is often DIFFERENT from the shipper (pickup) and consignee (dropoff). If the ordering party cannot be determined, use the shipper company name." },
                clientVatNumber: { type: SchemaType.STRING, description: "VAT/Tax number of THE CLIENT (VAT, BTW, USt, MwSt, NIP, CIF, UID). Format without spaces." },
                clientAddress: { type: SchemaType.STRING, description: "Registered office address of THE CLIENT (not warehouse/loading address), if present in the document." },
                clientEmail: { type: SchemaType.STRING, description: "Email address of THE CLIENT if present." },
                clientPhone: { type: SchemaType.STRING, description: "Phone number of THE CLIENT if present." }
              }
            }
          }
        }
      }
    };

    const prompt = `
You are an expert transport logistics AI. Read the attached shipping order(s), CMR, delivery note, rate confirmation or SPREADSHEET.
Extract ALL data perfectly into the requested JSON schema.

MULTI-TRIP DETECTION (CRITICAL):
1. One document can contain MULTIPLE transport orders/trips:
   - In spreadsheets: EACH DATA ROW that represents a shipment/load IS ONE TRIP. Column headers define the fields. Do NOT merge rows; do NOT invent totals rows as trips.
   - In PDFs/images: multiple pages, sections, tables or numbered orders = separate trips. Group fields per section carefully using their headings and layout.
2. If the document clearly contains only ONE order, return exactly ONE trip entry.
3. Each trip must carry ITS OWN references, dates, addresses, cargo data and price. Never mix values between two different trips.

CLIENT IDENTIFICATION (CRITICAL):
4. The CLIENT is the company that ordered/pays for the transport — usually shown in the letterhead/logo, the "from" email address, or labeled "Customer", "Klant", "Auftraggeber", "Opdrachtgever", "Zleceniodawca", "Mandant".
5. The shipper (loading company) and consignee (delivery company) are frequently NOT the client.
6. Fill clientVatNumber/clientAddress/clientEmail/clientPhone from the client's own block on the letterhead/footer when available.

DETERMINISM & ACCURACY (CRITICAL):
7. Extract exact, literal values as they appear in the document. Never guess, never fabricate. If a field is not in the document, leave it empty/null.
8. LOADING vs DELIVERY times: a time next to "Laden/Loading/Pickup/Abholung" belongs to pickupTime; next to "Afladen/Unloading/Delivery/Lieferung/Livrare" belongs to dropoffTime. NEVER swap them.
9. WEIGHT vs PALLETS: weightKg is kilograms ("kg", "Gewicht", "brutto"). Pallets is the pallet count ("palet", "EPAL", "pal"). If "24 t", convert to 24000 kg. If "33 Palets" and "1010 kg": weightKg=1010, pallets=33. NEVER mix them.
10. UNLOADING REFERENCE: never copy loadingReference into unloadingReference unless the document states it applies to both. Delivery refs like "ID 1816466" or "Unloading slot" go to unloadingReference.
11. Dates always YYYY-MM-DD (watch DD.MM.YYYY, MM/DD/YYYY formats and convert correctly). Times always HH:mm (24h). If the document shows a date WITH a time (e.g. "2026-08-29 06:00"), put the date in the date field and the time in the corresponding time field.
12. Addresses: full and geocodable — street + number, postal code + city, country. Fix postal code formatting (Poland/NL/Germany use "12345"/"12-345"/"1234 AB").
13. In spreadsheets with MULTIPLE sheets, inspect every sheet; a sheet may hold one trip (form-style label:value) or many trips (table rows).

CHRONOLOGY CHECK (ABSOLUTE RULE):
14. Loading CANNOT happen AFTER delivery. After extracting each trip, verify pickupDate <= dropoffDate.
    Labels mapping: Laden/Laaddatum/Chargement/Loading/Pickup -> pickup; Lossen/Losdatum/Déchargement/Unloading/Delivery/Abladen -> dropoff.
    If your extraction violates this (delivery earlier than loading), you have swapped them — re-read the document layout and assign each date/time to its correct side.

ADDRESS COMPLETION:
15. If the document only gives a company name plus a city/region (e.g. "Vijn, Echt, Netherlands") WITHOUT a street, use your knowledge of that specific company/facility to complete the FULL address: street + number, postal code, city, country (e.g. well-known logistics sites, warehouses, factory addresses). Prefer the exact operating location if identifiable, otherwise the company's registered address.
16. Never return just "Company, City": always produce a complete geocodable address string when the company is identifiable. If truly unknown even at registered-address level, give company name + city + country.
`;

    const request = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          documentPart
        ]
      }],
      generationConfig: generationConfig as any,
    };

    try {
      // Attempt to use Pro for best results
      const modelPro = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await modelPro.generateContent(request);
      return this.normalizeResult(JSON.parse(result.response.text()));
    } catch (error) {
      // If 429 Quota Exceeded on Free Tier, fallback gracefully to Flash
      console.warn("gemini-2.5-pro failed (likely quota limit). Falling back to gemini-2.5-flash. Error: ", error.message);
      const modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const fallbackResult = await modelFlash.generateContent(request);
      return this.normalizeResult(JSON.parse(fallbackResult.response.text()));
    }
  }

  /**
   * Defensive normalization: guarantees a non-empty `trips` array,
   * then runs logical sanity checks on every trip.
   */
  private normalizeResult(parsed: any): { trips: any[] } {
    let trips: any[] = [];
    if (parsed && Array.isArray(parsed.trips)) {
      trips = parsed.trips.filter(Boolean);
    } else if (Array.isArray(parsed)) {
      trips = parsed;
    } else if (parsed && (parsed.pickupCompanyName || parsed.dropoffAddress || parsed.loadingReference)) {
      // Legacy single-object response
      trips = [parsed];
    }
    return { trips: trips.map(t => this.validateTrip(t)) };
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(String(value).trim());
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Logical sanity checks per trip:
   * - Loading can never happen after delivery. If the extracted dates
   *   violate this, the sides were swapped -> swap dates AND times back
   *   (earlier = loading, later = delivery).
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
