import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert transport logistics AI that reads shipping orders, CMR documents, freight orders, or delivery notes from transport companies.

Carefully extract all the following details from the document image. Be very precise:

- pickupCompanyName: Name of the company/warehouse where the cargo is picked up/loaded. If not found, return null.
- pickupAddress: Full pickup/loading address including city and country. Be careful to extract the ACTUAL loading place, not the transporter's office.
- dropoffCompanyName: Name of the company/warehouse where the cargo is delivered/unloaded. If not found, return null.
- dropoffAddress: Full delivery/dropoff/unloading address including city and country. DO NOT confuse this with the billing/invoice address.
- pickupDate: Loading date in YYYY-MM-DD format
- dropoffDate: Delivery date in YYYY-MM-DD format
- pickupTime: Loading time in HH:mm format (24h). Look carefully near the pickup date; it might be written right next to it (e.g. 14:00 or 14.00). If not found, return null.
- dropoffTime: Delivery time/unloading time in HH:mm format (24h). Look carefully near the delivery date; it might be written right next to it. If not found, return null.
- price: The freight price/transport price in EUR (number only). If not found, return null.
- weightKg: Total cargo weight strictly in KILOGRAMS (number only). CRITICAL: DO NOT extract the number of boxes, cartons, or pieces here. Only look for values labeled with "kg", "kgs", "gross weight", or "net weight".
- pallets: Number of pallets (number only). If not found, return null.
- palletType: Type of pallets (e.g. "Euro", "Block"). If not found, return null.
- volumeCbm: Volume in cubic meters (number only). If not found, return null.
- loadingReference: Any reference number specifically for pickup/loading, or the main order number. (Note: it can be a short 6-digit number labeled as Auftrag, Order, or Ref). DO NOT put the unloading reference here.
- unloadingReference: Any reference number specifically for delivery/unloading. CRITICAL: DO NOT copy the loadingReference here unless it explicitly applies to both. If there is no specific delivery reference, return null.
- notes: Any important notes, special instructions, or cargo description from the document.

Respond ONLY with a valid JSON object with these exact keys. Do not wrap in markdown code blocks. Do not add explanations. If a field cannot be found, use null.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  }
}
