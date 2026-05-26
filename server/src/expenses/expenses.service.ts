import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from './expense.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ExpensesService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectRepository(Expense) private repo: Repository<Expense>,
  ) {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  findAll() {
    return this.repo.find({ order: { date: 'DESC', createdAt: 'DESC' } });
  }

  async create(dto: any) {
    const expense = this.repo.create(dto);
    return this.repo.save(expense);
  }

  async update(id: string, dto: any) {
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }

  async getExpensesForMonth(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return this.repo.find({
      where: { date: Between(start, end) }
    });
  }

  async parseReceiptWithAI(fileUrl: string): Promise<any> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured. Cannot perform AI extraction.');
    }

    try {
      // 1. Fetch the image from Cloudinary (fileUrl)
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      // 2. Use Gemini Vision (gemini-1.5-flash) to parse
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `
You are an AI assistant parsing a receipt or invoice image.
Extract the following details from the receipt:
- amount: The total price/amount (as a number, without currency symbols).
- currency: The currency symbol or code (e.g., EUR, USD, RON). If not found, guess based on context or default to EUR.
- description: A short 2-5 word description of what the receipt is for (e.g., Fuel Station OMV, Truck parts, Accounting).
- date: The date on the receipt in YYYY-MM-DD format.

Respond ONLY with a valid JSON object with the keys "amount", "currency", "description", and "date". Do not wrap it in markdown block quotes.
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
      // Safely parse JSON from the response text
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanText);
      
      return data;
    } catch (e) {
      console.error('AI Parse Error:', e);
      throw new Error('Failed to parse receipt with AI');
    }
  }
}
