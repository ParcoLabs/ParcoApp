import OpenAI from 'openai';

interface ExtractionInput {
  docType: string;
  track: string;
  text: string;
}

interface ExtractedFieldResult {
  key: string;
  value: string;
  confidence: number;
  metadata?: Record<string, any>;
}

interface ExtractionOutput {
  fields: ExtractedFieldResult[];
  notes: string;
  method: 'openai' | 'regex-fallback';
}

const TARGET_KEYS = [
  'property_address',
  'property_city',
  'property_state',
  'property_zip',
  'entity_name',
  'entity_state',
  'estimated_property_value',
  'ownership_evidence_present',
  'rent_estimate_monthly',
  'expense_estimate_monthly',
];

function hasOpenAIKey(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

async function extractWithOpenAI(input: ExtractionInput): Promise<ExtractionOutput> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are a real estate document analysis engine. Extract structured fields from document text.
Return ONLY valid JSON with this exact schema:
{
  "fields": [
    {
      "key": "<field_key>",
      "value": "<extracted_value>",
      "confidence": <0.0-1.0>,
      "metadata": { "sourceQuote": "<exact quote from text>" }
    }
  ],
  "notes": "<any observations about data quality or missing info>"
}

Target fields to extract (include only those found in the text):
- property_address: Full street address of the property
- property_city: City where the property is located
- property_state: US state (2-letter code preferred)
- property_zip: ZIP code
- entity_name: Legal entity name (LLC, Corp, etc.)
- entity_state: State of entity formation
- estimated_property_value: Dollar amount (numeric string, no $ or commas)
- ownership_evidence_present: "true" or "false" - whether deed/title evidence exists
- rent_estimate_monthly: Monthly rent amount (numeric string)
- expense_estimate_monthly: Monthly expense amount (numeric string)

For critical fields (property_address, entity_name, estimated_property_value), always include sourceQuote in metadata with the exact text passage.
Set confidence based on how clearly the value appears in the text (1.0 = explicit, 0.7 = inferred, 0.4 = uncertain).`;

  const userPrompt = `Document type: ${input.docType}
Regulatory track: ${input.track}

Document text:
${input.text.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    const fields: ExtractedFieldResult[] = (parsed.fields || []).map((f: any) => ({
      key: String(f.key || ''),
      value: String(f.value || ''),
      confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.5)),
      metadata: f.metadata || undefined,
    })).filter((f: ExtractedFieldResult) => f.key && f.value);

    return {
      fields,
      notes: parsed.notes || '',
      method: 'openai' as const,
    };
  } catch {
    return { fields: [], notes: 'Failed to parse LLM response', method: 'openai' as const };
  }
}

function extractWithRegex(input: ExtractionInput): ExtractionOutput {
  const text = input.text;
  const fields: ExtractedFieldResult[] = [];
  const notes: string[] = [];

  const addressMatch = text.match(/(?:Property\s+Address|Address)[:\s]+(.+?)(?:\n|$)/i);
  if (addressMatch) {
    fields.push({ key: 'property_address', value: addressMatch[1].trim(), confidence: 0.7 });
  }

  const cityMatch = text.match(/(?:City)[:\s]+([A-Za-z\s]+?)(?:,|\n|$)/i)
    || text.match(/,\s*([A-Za-z\s]+?),\s*[A-Z]{2}\s+\d{5}/);
  if (cityMatch) {
    fields.push({ key: 'property_city', value: cityMatch[1].trim(), confidence: 0.6 });
  }

  const stateMatch = text.match(/(?:State)[:\s]+([A-Z]{2})\b/i)
    || text.match(/,\s*([A-Z]{2})\s+\d{5}/);
  if (stateMatch) {
    fields.push({ key: 'property_state', value: stateMatch[1].trim().toUpperCase(), confidence: 0.7 });
  }

  const zipMatch = text.match(/(?:Zip|ZIP|Postal)[:\s]+(\d{5}(?:-\d{4})?)/i)
    || text.match(/[A-Z]{2}\s+(\d{5}(?:-\d{4})?)/);
  if (zipMatch) {
    fields.push({ key: 'property_zip', value: zipMatch[1].trim(), confidence: 0.7 });
  }

  const entityMatch = text.match(/(?:Entity|Company|LLC|Grantor|Grantee|Insured|Owner|Vesting)[:\s]+([^\n,]+(?:LLC|Corp|Inc|LP|Trust)[^\n]*)/i)
    || text.match(/([\w\s]+(?:LLC|Corp|Inc|LP|Trust)(?:\s*,?\s*a\s+\w+\s+\w+)?)/i);
  if (entityMatch) {
    fields.push({ key: 'entity_name', value: entityMatch[1].trim(), confidence: 0.6 });
  }

  const entityStateMatch = text.match(/(?:organized|formed|under the laws of)\s+(\w+)/i)
    || text.match(/a\s+(\w+)\s+(?:Series\s+)?LLC/i);
  if (entityStateMatch) {
    fields.push({ key: 'entity_state', value: entityStateMatch[1].trim(), confidence: 0.5 });
  }

  const valueMatch = text.match(/(?:Appraised\s+Value|Value|Consideration|Price)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (valueMatch) {
    fields.push({ key: 'estimated_property_value', value: valueMatch[1].replace(/,/g, ''), confidence: 0.7 });
  }

  const hasDeedOrTitle = /(?:deed|title|warranty|conveyance|grant)/i.test(text);
  fields.push({ key: 'ownership_evidence_present', value: hasDeedOrTitle ? 'true' : 'false', confidence: hasDeedOrTitle ? 0.7 : 0.4 });

  const rentMatch = text.match(/(?:Rent|Monthly\s+Rent|Rental\s+Income)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (rentMatch) {
    fields.push({ key: 'rent_estimate_monthly', value: rentMatch[1].replace(/,/g, ''), confidence: 0.6 });
  }

  const expenseMatch = text.match(/(?:Expense|Monthly\s+Expense|Operating\s+Expense)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (expenseMatch) {
    fields.push({ key: 'expense_estimate_monthly', value: expenseMatch[1].replace(/,/g, ''), confidence: 0.5 });
  }

  if (fields.length === 0) {
    notes.push('No fields could be extracted via regex fallback');
  } else {
    notes.push(`Regex fallback extracted ${fields.length} fields (no LLM available)`);
  }

  return { fields, notes: notes.join('; '), method: 'regex-fallback' as const };
}

export async function extractFieldsFromText(input: ExtractionInput): Promise<ExtractionOutput> {
  if (hasOpenAIKey()) {
    try {
      const result = await extractWithOpenAI(input);
      if (result.fields.length > 0) return result;
      const fallback = extractWithRegex(input);
      return {
        fields: fallback.fields,
        notes: `LLM returned no fields, fell back to regex. ${fallback.notes}`,
        method: 'regex-fallback',
      };
    } catch (err: any) {
      console.error('[llmExtraction] OpenAI error, falling back to regex:', err.message);
      const fallback = extractWithRegex(input);
      return {
        fields: fallback.fields,
        notes: `OpenAI error (${err.message}), used regex fallback. ${fallback.notes}`,
        method: 'regex-fallback',
      };
    }
  }

  return extractWithRegex(input);
}

export { TARGET_KEYS };
