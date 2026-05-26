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
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          pickupCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is picked up/loaded." },
          pickupAddress: { type: SchemaType.STRING, description: "Full pickup/loading address including city and country. Extract ACTUAL loading place, not transporter's office." },
          dropoffCompanyName: { type: SchemaType.STRING, description: "Name of the company/warehouse where the cargo is delivered/unloaded." },
          dropoffAddress: { type: SchemaType.STRING, description: "Full delivery/dropoff/unloading address including city and country." },
          pickupDate: { type: SchemaType.STRING, description: "Loading date in YYYY-MM-DD format" },
          dropoffDate: { type: SchemaType.STRING, description: "Delivery date in YYYY-MM-DD format" },
          pickupTime: { type: SchemaType.STRING, description: "Loading time in HH:mm format. Look carefully near the pickup date; it might be written right next to it (e.g. 14:00 or 14.00)." },
          dropoffTime: { type: SchemaType.STRING, description: "Delivery time/unloading time in HH:mm format. Look carefully near the delivery date; it might be written right next to it." },
          price: { type: SchemaType.NUMBER, description: "The freight price/transport price in EUR." },
          weightKg: { type: SchemaType.NUMBER, description: "Total cargo weight strictly in KILOGRAMS. CRITICAL: NEVER use number of boxes, cartons, or pieces here. Look for values labeled 'kg', 'kgs', 'gross weight'." },
          pallets: { type: SchemaType.NUMBER, description: "Number of PALLETS (e.g. 2, 33). CRITICAL: NEVER confuse this with the number of boxes/cartons (Colli/Boxes). If the document says 200 boxes on 2 pallets, the value here is 2." },
          palletType: { type: SchemaType.STRING, description: "Type of pallets (e.g. 'Euro', 'Block')." },
          volumeCbm: { type: SchemaType.NUMBER, description: "Volume strictly in cubic meters (CBM/m3). CRITICAL: NEVER put pallets or weight here." },
          loadingReference: { type: SchemaType.STRING, description: "Reference number specifically for pickup/loading, or the main order number (Auftrag, Order, Ref). Can be a short 6-digit number." },
          unloadingReference: { type: SchemaType.STRING, description: "Reference number specifically for delivery/unloading. CRITICAL: DO NOT copy the loadingReference here unless it explicitly applies to both." },
          notes: { type: SchemaType.STRING, description: "Important notes, special instructions, or cargo description." }
        }
      }
    };

    const prompt = `
You are an expert transport logistics AI. Read the attached shipping order, CMR, or delivery note.
Extract the data perfectly into the requested JSON schema.
PAY EXTREME ATTENTION to the following rules because you have failed them previously:
1. DELIVERY TIME: Look extremely carefully near the delivery/unloading date for any hours (e.g., "14:00", "08.00-16.00"). Extract it to dropoffTime.
2. PALLETS vs BOXES: Never confuse "Colli" or "Boxes" with Pallets. If a document lists 150 cartons, that is NOT the number of pallets. Leave pallets null if not explicitly stated as pallets/epal.
3. WEIGHT vs VOLUME: Weight is always in kg. Volume is always in m3 / cbm. Do not mix them up.
4. UNLOADING REFERENCE: Do not invent or copy the loading reference into the unloading reference unless it is clearly stated as a delivery reference. Leave null if missing.
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

