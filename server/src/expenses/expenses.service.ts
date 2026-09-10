import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from './expense.entity';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

  async parseReceiptWithAI(buffer: Buffer, originalMimeType: string): Promise<any> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured. Cannot perform AI extraction.');
    }

    let mimeType = originalMimeType || 'image/jpeg';
    
    // Gemini supports specific mime types. Normalize common ones:
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    if (mimeType.includes('pdf')) mimeType = 'application/pdf';
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
      mimeType = 'image/jpeg';
    }

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          amount: { type: SchemaType.NUMBER, description: "The total price or amount as a number, without currency symbols." },
          currency: { type: SchemaType.STRING, description: "The currency symbol or code e.g. EUR, USD, RON. Default to EUR if not specified." },
          description: { type: SchemaType.STRING, description: "A short 2-5 word description of what the receipt/invoice is for e.g. Fuel Station OMV, Truck parts, Accounting." },
          date: { type: SchemaType.STRING, description: "The date of the expense/receipt in YYYY-MM-DD format." }
        },
        required: ["amount", "currency", "description", "date"]
      }
    };

    const prompt = `
You are an expert financial logistics AI assistant parsing a receipt or invoice image.
Extract the details perfectly into the requested JSON schema.
Ensure amount is a clean number, currency is standard, description is a clear summary, and date matches YYYY-MM-DD.
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
      // Try Pro first for maximum accuracy
      const modelPro = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await modelPro.generateContent(request);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.warn("gemini-2.5-pro failed for expenses parsing, falling back to gemini-2.5-flash. Error:", error.message);
      // Fallback to Flash
      const modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const fallbackResult = await modelFlash.generateContent(request);
      return JSON.parse(fallbackResult.response.text());
    }
  }
}
