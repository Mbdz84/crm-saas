import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const PARSE_MODEL = process.env.OPENAI_PARSE_MODEL || "gpt-4.1";

export async function parseTextWithAI(text: string) {
  const prompt = `
Extract the following fields from the text. Return ONLY valid JSON.

Rules:
- Extract up to TWO phone numbers.
- The FIRST phone number → customerPhone
- The SECOND phone number → customerPhone2
- If only one phone exists, customerPhone2 must be null
- Do NOT invent data

Return format:
{
  "source": "",
  "customerName": "",
  "customerPhone": "",
  "customerPhone2": "",
  "customerAddress": "",
  "jobType": "",
  "description": ""
}

Text:
${text}
`;

  const completion = await openai.chat.completions.create({
    model: PARSE_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  return JSON.parse(raw);
}