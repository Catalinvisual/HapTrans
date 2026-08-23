import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type {
  WorkbookContext,
  FieldMapping,
  ImportMappings,
  HapCargoField,
} from './excel-import.types';
import { HAPCARGO_FIELDS } from './excel-import.types';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a transport-logistics data interpreter specialized in mapping Excel/spreadsheet columns 
to HapCargo transport order fields.

## Your Task
You receive a structured description of an Excel workbook (headers, sample values, column statistics).
You must determine what each column MOST LIKELY represents in a transport order context.

## Critical Rules

1. DO NOT interpret column names in isolation.
   - Analyze the ACTUAL VALUES in the column.
   - Analyze NEIGHBORING columns and their names.
   - Analyze the PATTERNS across multiple rows.
   - Consider the ENTIRE workbook context.

2. DO NOT assume a column means what its name literally says.
   Example: "Vracht auto nr" might seem to mean "truck registration number",
   but if the values are like 458721, 458722, 458723 and neighboring columns are 
   Datum, Laden bij, Laadtijd, Losadres — then it is a LOADING REFERENCE, not a truck registration.

3. MULTI-LANGUAGE SUPPORT
   Understand column names and values in English, Dutch, German, French, Romanian, and other European languages.
   Examples:
   - Laadadres / Beladestelle / Loading Address / Adresse de chargement / Adresa incarcarii → pickupAddress
   - Losadres / Entladeadresse / Delivery Address / Adresse de livraison / Adresa livrarii → deliveryAddress
   - Laaddatum / Ladedatum / Loading Date / Date de chargement / Data incarcarii → pickupDate
   - Losdatum / Entladedatum / Delivery Date / Date de livraison / Data livrarii → deliveryDate

4. CONTEXTUAL EVIDENCE
   Use ALL available evidence:
   - Column name semantic meaning
   - Actual cell values and patterns
   - Neighboring column names
   - Value distributions (numeric%, date%, reference-like%)
   - Position in the column sequence

5. CONFIDENCE
   Assign confidence based on certainty:
   - 0.90–1.00: Very clear, multiple evidence points align
   - 0.70–0.89: Likely but some ambiguity
   - Below 0.70: Uncertain, flag for user review

6. DO NOT INVENT information. If a column's purpose cannot be determined, map it to "IGNORE" with low confidence.

7. RETURN ONLY JSON. No explanatory text outside the JSON structure.

## HapCargo Canonical Order Fields
${HAPCARGO_FIELDS.filter(f => f !== 'IGNORE').map(f => `- ${f}`).join('\n')}
- IGNORE (use this when the column has no meaningful mapping to any order field)

## Transport Context Vocabulary
- Loading / Pickup / Laden / Chargement / Beladung / Incarcare → pickup side
- Delivery / Unloading / Lossen / Livraison / Entladung / Livrare → delivery side
- Vrachtnummer / Vracht nr / Load nr / CMR nr / Loading ref → loadingReference (NOT truck registration)
- Klantreferentie / Customer ref / CP order nr / Your ref / PO → externalReference
- Klant / Opdrachtgever / Client / Customer → clientName
- Gewicht / Weight / Poids / Gewicht → weight (in kg)
- Pallets / Pal / EPAL / Palets → pallets (count)
`;

// ─── Response schema for Gemini ───────────────────────────────────────────────

function buildMappingSchema() {
  return {
    type: SchemaType.OBJECT,
    properties: {
      mappings: {
        type: SchemaType.ARRAY,
        description: 'One mapping entry per source Excel column',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            sourceColumn: {
              type: SchemaType.STRING,
              description: 'The exact column header from the Excel file',
            },
            targetField: {
              type: SchemaType.STRING,
              description: 'The HapCargo canonical field name this column maps to, or "IGNORE"',
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
            reason: {
              type: SchemaType.STRING,
              description: 'Brief explanation of why this mapping was chosen',
            },
          },
          required: ['sourceColumn', 'targetField', 'confidence', 'reason'],
        },
      },
    },
    required: ['mappings'],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AiMapperService {
  private readonly logger = new Logger(AiMapperService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Given a structured workbook context, ask the AI to map each column
   * to a HapCargo Order field. Returns validated field mappings.
   */
  async mapColumns(context: WorkbookContext): Promise<FieldMapping[]> {
    if (!this.genAI) {
      this.logger.warn('GEMINI_API_KEY not configured — using heuristic fallback');
      return this.heuristicFallback(context.primarySheet.headers);
    }

    const userPrompt = this.buildUserPrompt(context);

    const request = {
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
        responseSchema: buildMappingSchema(),
      } as any,
    };

    let rawText: string;
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(request);
      rawText = result.response.text();
    } catch (e: any) {
      this.logger.error('AI mapping call failed:', e?.message);
      throw new Error(`AI mapping failed: ${e?.message}`);
    }

    const parsed = this.safeParseResponse(rawText);
    const validated = this.validateMappings(parsed, context.primarySheet.headers);
    return validated;
  }

  // ─── Build structured prompt ─────────────────────────────────────────────

  private buildUserPrompt(context: WorkbookContext): string {
    const sheet = context.primarySheet;

    const columnDescriptions = sheet.columnStats.map(col => {
      const lines = [
        `Column ${col.index + 1}: "${col.header}"`,
        `  - Sample values: ${col.sampleValues.slice(0, 5).map(v => `"${v}"`).join(', ')}`,
        `  - Non-empty: ${col.nonEmptyCount}/${col.totalCount} rows`,
        `  - Unique values: ${col.uniqueCount}`,
        `  - Type profile: ${(col.numericPercent * 100).toFixed(0)}% numeric, ${(col.datePercent * 100).toFixed(0)}% date-like, ${(col.timePercent * 100).toFixed(0)}% time-like, ${(col.referencePercent * 100).toFixed(0)}% reference-like`,
      ];
      return lines.join('\n');
    });

    const sampleRowsText = sheet.sampleRowsFirst.slice(0, 3).map((row, i) => {
      const entries = Object.entries(row).map(([k, v]) => `"${k}": "${v}"`).join(', ');
      return `Row ${i + 1}: { ${entries} }`;
    });

    return `
## WORKBOOK TO ANALYZE

File: ${context.fileName}
Sheet: "${sheet.sheetName}"
Total data rows: ${sheet.rowCount}
Columns: ${sheet.columnCount}

## ALL COLUMN HEADERS (in order)
${sheet.headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

## COLUMN ANALYSIS
${columnDescriptions.join('\n\n')}

## SAMPLE DATA ROWS
${sampleRowsText.join('\n')}

## YOUR TASK
Map EVERY column listed above to the most appropriate HapCargo field.
For each column, analyze the column name, its actual values, neighboring columns, and data patterns.
Remember: DO NOT interpret "Vracht auto nr" as truck registration — look at the values and context.

Return a JSON object with a "mappings" array containing one entry per column.
`;
  }

  // ─── Response parsing & validation ───────────────────────────────────────

  private safeParseResponse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* ignore */ }
      }
      return {};
    }
  }

  private validateMappings(parsed: any, headers: string[]): FieldMapping[] {
    if (!parsed || !Array.isArray(parsed.mappings)) {
      this.logger.warn('AI returned invalid mapping structure, using heuristic fallback');
      return this.heuristicFallback(headers);
    }

    const validFields = new Set(HAPCARGO_FIELDS as readonly string[]);
    const headerSet = new Set(headers.filter(Boolean));
    const result: FieldMapping[] = [];

    for (const m of parsed.mappings) {
      if (!m || typeof m !== 'object') continue;
      const sourceColumn = String(m.sourceColumn || '').trim();
      if (!sourceColumn || !headerSet.has(sourceColumn)) continue;
      const targetField = validFields.has(m.targetField) ? m.targetField as HapCargoField : 'IGNORE';
      const confidence = typeof m.confidence === 'number'
        ? Math.max(0, Math.min(1, m.confidence))
        : 0.5;
      const reason = String(m.reason || '').slice(0, 500);
      result.push({ sourceColumn, targetField, confidence, reason });
    }

    // Add IGNORE for any headers that AI didn't cover
    const mapped = new Set(result.map(r => r.sourceColumn));
    for (const h of headers) {
      if (h && !mapped.has(h)) {
        result.push({ sourceColumn: h, targetField: 'IGNORE', confidence: 0.5, reason: 'Not covered by AI response' });
      }
    }

    return result;
  }

  // ─── Heuristic fallback (no AI key configured) ────────────────────────────

  private heuristicFallback(headers: string[]): FieldMapping[] {
    const SYNONYMS: Array<[HapCargoField, string[]]> = [
      ['loadingReference', ['vracht auto nr', 'vrachtnummer', 'vracht nr', 'load nr', 'loading ref', 'cmr', 'cmr nr']],
      ['externalReference', ['klantreferentie', 'customer ref', 'customer reference', 'cp order nr', 'po nr', 'your ref']],
      ['unloadingReference', ['unloading ref', 'los ref', 'aflevernummer', 'slot id']],
      ['pickupDate', ['laaddatum', 'laad datum', 'loading date', 'pickup date', 'datum laden']],
      ['pickupTimeFrom', ['laadtijd', 'loading time', 'pickup time', 'tijd laden']],
      ['pickupCompany', ['laden bij', 'loading company', 'shipper', 'verlader']],
      ['pickupAddress', ['laadadres', 'laad adres', 'loading address', 'pickup address']],
      ['pickupCity', ['laadplaats', 'laad plaats', 'loading city']],
      ['pickupCountry', ['laad land', 'loading country']],
      ['deliveryDate', ['losdatum', 'los datum', 'delivery date', 'leverdatum', 'datum lossen']],
      ['deliveryTimeFrom', ['lostijd', 'delivery time', 'unloading time']],
      ['deliveryCompany', ['lossen bij', 'delivery company', 'consignee']],
      ['deliveryAddress', ['losadres', 'los adres', 'delivery address', 'unloading address']],
      ['deliveryCity', ['losplaats', 'woonplaats', 'city', 'stad', 'ort']],
      ['deliveryPostalCode', ['postcode', 'postal code', 'plz', 'zip']],
      ['deliveryCountry', ['land', 'country', 'ln i2', 'landcode']],
      ['weight', ['gewicht', 'weight', 'gewicht kg', 'bruto', 'brutto']],
      ['pallets', ['pallets', 'pallet', 'pal euro', 'pal blok', 'epal', 'aantal paletten']],
      ['volume', ['volume', 'm3', 'cbm', 'volume m3']],
      ['price', ['prijs', 'price', 'tarief', 'rate', 'fracht']],
      ['currency', ['valuta', 'currency', 'munt']],
      ['clientName', ['klant', 'opdrachtgever', 'client', 'customer']],
      ['notes', ['opmerkingen', 'opmerking', 'notes', 'remarks', 'notitie']],
      ['contactPerson', ['contact persoon', 'contactpersoon', 'contact person']],
      ['contactPhone', ['telefoon', 'tel', 'phone', 'gsm']],
    ];

    function normalize(s: string): string {
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    return headers.filter(Boolean).map(h => {
      const hn = normalize(h);
      let bestField: HapCargoField = 'IGNORE';
      let bestLen = 0;
      for (const [field, syns] of SYNONYMS) {
        for (const s of syns) {
          if ((hn === s || hn.includes(s)) && s.length > bestLen) {
            bestLen = s.length;
            bestField = field;
          }
        }
      }
      return {
        sourceColumn: h,
        targetField: bestField,
        confidence: bestField === 'IGNORE' ? 0.3 : 0.75,
        reason: bestField === 'IGNORE' ? 'No match found in heuristic dictionary' : 'Matched via heuristic synonym dictionary',
      } as FieldMapping;
    });
  }
}
