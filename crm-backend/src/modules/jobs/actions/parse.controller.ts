import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const PARSE_MODEL = process.env.OPENAI_PARSE_MODEL || "gpt-4.1";

export async function parseJobFromText(req: Request, res: Response) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Missing text" });

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

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI parse error" });
    }

    // Clean address
    function normalizeAddress(address: string): string {
      if (!address) return "";
      let a = address;
      a = a.replace(/,?\s*United States/i, "");
      a = a.replace(/(\d{5})-\d{4}/, "$1");
      a = a.replace(/(\d{5}).*$/, "$1");
      a = a.replace(/\s+/g, " ").replace(/,\s*,/g, ", ").trim();
      return a;
    }

    return res.json({
  source: parsed.source || null,
  customerName: parsed.customerName || null,
  customerPhone: parsed.customerPhone || null,
  customerPhone2: parsed.customerPhone2 || null, // ✅ ADD THIS
  customerAddress: parsed.customerAddress
    ? normalizeAddress(parsed.customerAddress)
    : null,
  jobType: parsed.jobType || null,
  description: parsed.description || null,
});
  } catch (err) {
    console.error("parseJobFromText error:", err);
    return res.status(500).json({ error: "Failed to parse job text" });
  }
}