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

  async scanTripDocument(fileUrl: string): Promise<any> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert transport logistics AI that reads shipping orders, CMR documents, freight orders, or delivery notes from transport companies.

Carefully extract all the following details from the document image. Be very precise:

- pickupAddress: Full pickup/loading address including city and country (as complete as possible)
- dropoffAddress: Full delivery/dropoff address including city and country (as complete as possible)
- pickupDate: Loading date in YYYY-MM-DD format
- dropoffDate: Delivery date in YYYY-MM-DD format
- pickupTime: Loading time in HH:mm format (24h). If not found, return null.
- dropoffTime: Delivery time in HH:mm format (24h). If not found, return null.
- price: The freight price/transport price in EUR (number only, no currency symbol). If not found, return null.
- weightKg: Total cargo weight in kg (number only). If not found, return null.
- pallets: Number of pallets (number only). If not found, return null.
- palletType: Type of pallets (e.g. "Euro paleti", "Block paleti"). If not found, return null.
- volumeCbm: Volume in cubic meters (number only). If not found, return null.
- loadingReference: Any loading reference number or CMR number or order number. If not found, return null.
- unloadingReference: Any unloading reference or delivery reference. If not found, return null.
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
