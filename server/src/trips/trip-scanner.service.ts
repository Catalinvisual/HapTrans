import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

@Injectable()
export class TripScannerService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async scanTripDocument(buffer: Buffer, originalMimeType: string): Promise<any> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    let mimeType = originalMimeType || 'image/jpeg';
    
    // Gemini supports specific mime types. Normalize common ones:
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    if (mimeType.includes('pdf')) mimeType = 'application/pdf';
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
      mimeType = 'image/jpeg'; // fallback
    }

    const generationConfig = {
      responseMimeType: "application/json",
      temperature: 0,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          pickupCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is picked up/loaded." },
          pickupAddress: { type: SchemaType.STRING, description: "Full pickup/loading address. CRITICAL: Format it cleanly for geocoding (e.g. 'Street Name Number, Postal Code City, Country'). For countries like Poland, ensure the postal code has a hyphen (e.g. '43-150 Bieruń, Poland' instead of '43 150 BIERUN'). Extract ACTUAL loading place, not transporter's office." },
          dropoffCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is delivered/unloaded." },
          dropoffAddress: { type: SchemaType.STRING, description: "Full delivery/dropoff/unloading address. CRITICAL: Format it cleanly for geocoding (e.g. 'Street Name Number, Postal Code City, Country'). For countries like Poland, ensure the postal code has a hyphen (e.g. '43-150 Bieruń, Poland')." },
          pickupDate: { type: SchemaType.STRING, description: "Loading date in YYYY-MM-DD format" },
          dropoffDate: { type: SchemaType.STRING, description: "Delivery date in YYYY-MM-DD format" },
          pickupTime: { type: SchemaType.STRING, description: "Loading/pickup time in HH:mm format. Look carefully near the pickup date or loading instructions (e.g. 'Laden om 15:30'). CRITICAL: Only fill if it is explicitly the loading/pickup time. Do not confuse it with unloading/delivery times." },
          dropoffTime: { type: SchemaType.STRING, description: "Delivery/unloading/dropoff time in HH:mm format. Look carefully near the delivery date or unloading instructions (e.g. 'unloading at 12:00'). CRITICAL: Only fill if it is explicitly the unloading/delivery time. Do not confuse it with loading/pickup times." },
          price: { type: SchemaType.NUMBER, description: "The freight price/transport price in EUR." },
          weightKg: { type: SchemaType.NUMBER, description: "Total cargo weight strictly in KILOGRAMS (e.g. 1010, 24000). CRITICAL: NEVER copy the number of pallets, boxes, cartons, or pieces here. Look for keywords like 'kg', 'kgs', 'Gewicht', 'brutto', 'gross weight'. If weight is in tons (e.g. 24 t), convert to kg (24000)." },
          pallets: { type: SchemaType.NUMBER, description: "Number of PALLETS (e.g. 2, 33). CRITICAL: NEVER confuse this with weight (KG), volume (CBM), or number of cartons. Look specifically for keywords like 'palets', 'EPAL', 'pal', 'EUR-pallets'." },
          palletType: { type: SchemaType.STRING, description: "Type of pallets (e.g. 'Euro', 'Block')." },
          volumeCbm: { type: SchemaType.NUMBER, description: "Volume strictly in cubic meters (CBM/m3). CRITICAL: NEVER put pallets or weight here. Look for keywords like 'cbm', 'm3'." },
          loadingReference: { type: SchemaType.STRING, description: "Reference number specifically for pickup/loading, or the main order number (Auftrag, Order, Ref). Can be a short 6-digit number." },
          unloadingReference: { type: SchemaType.STRING, description: "Reference number specifically for delivery/unloading. Look for keywords like 'unloading ref', 'delivery reference', 'unloading slot id'. CRITICAL: DO NOT copy the loadingReference here unless it explicitly applies to both." },
          notes: { type: SchemaType.STRING, description: "Important notes, special instructions, or cargo description." }
        }
      }
    };

    const prompt = `
You are an expert transport logistics AI. Read the attached shipping order, CMR, or delivery note.
Extract the data perfectly into the requested JSON schema.
PAY EXTREME ATTENTION to the following rules because you have failed them previously:
1. DETERMINISM & ACCURACY: Extract exact, literal values as they appear in the document.
2. LOADING/DELIVERY TIMES: Look at the text surrounding any times:
   - If a time is next to "Laden", "Loading", "Pickup", "Abholung", "Chargement", it belongs to pickupTime.
   - If a time is next to "Abladen", "Unloading", "Delivery", "Lieferung", "Entladung", "Livrare", it belongs to dropoffTime.
   - NEVER copy a delivery/unloading time (like 15:30) into pickupTime.
3. WEIGHT vs PALLETS: Cargo weight (weightKg) is in kilograms. Pallets is the count of pallets. NEVER mix them up. If the document has "33 Palets" and "1010 kg", weightKg is 1010 and pallets is 33.
4. UNLOADING REFERENCE: Do not copy the loadingReference into the unloadingReference unless the document clearly says it applies to both. If there is a delivery reference or unloading reference (e.g., "ID 1816466" or "Unloading Ref"), put it in unloadingReference.
`;

    const request = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: buffer.toString('base64'), mimeType } }
        ]
      }],
      generationConfig: generationConfig as any,
    };

    try {
      // Attempt to use Pro for best results
      const modelPro = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await modelPro.generateContent(request);
      return JSON.parse(result.response.text());
    } catch (error) {
      // If 429 Quota Exceeded on Free Tier, fallback gracefully to Flash
      console.warn("gemini-2.5-pro failed (likely quota limit). Falling back to gemini-2.5-flash. Error: ", error.message);
      const modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const fallbackResult = await modelFlash.generateContent(request);
      return JSON.parse(fallbackResult.response.text());
    }
  }
}

