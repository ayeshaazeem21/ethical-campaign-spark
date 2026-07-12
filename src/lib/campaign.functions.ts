import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const Input = z.object({
  audience: z.string().min(1),
  focus: z.string().min(1),
  format: z.string().min(1),
  tone: z.string().min(1),
});

export type CampaignResult = {
  title: string;
  headline: string;
  content: string;
  callToAction: string;
  visualDirection: string;
  hashtags: string[];
  resources: { name: string; description: string; url: string }[];
};

export const generateCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<CampaignResult> => {
console.log("ENV:", Object.keys(process.env).filter(k => k.includes("GEMINI")));
const key = process.env.GEMINI_API_KEY;
console.log("Gemini Key:", key);

if (!key) {
  throw new Error("Missing GEMINI_API_KEY");
}
const ai = new GoogleGenAI({
  apiKey: key,
});

    const system = `You are Beacon, an ethical, trauma-informed campaign generator specializing in anti-human trafficking awareness.

CORE PRINCIPLES:
- Survivor-centered language: never sensationalize, exploit, or use graphic imagery
- Trauma-informed: avoid fear-based messaging, victim-blaming, or stereotypes
- Empowering: focus on prevention, support, education, and community action
- Accurate: use verified statistics and trusted resources only
- Inclusive: recognize trafficking affects all demographics
- Never depict victims as helpless; center dignity and agency

Always return STRICT JSON matching the requested schema. No markdown, no code fences, no commentary.`;

    const prompt = `Create an ethical anti-human trafficking awareness campaign with these parameters:
- Audience: ${data.audience}
- Campaign Focus: ${data.focus}
- Content Format: ${data.format}
- Tone: ${data.tone}

Return ONLY valid JSON (no code fences) with this exact shape:
{
  "title": "short campaign name",
  "headline": "attention-grabbing but respectful headline",
  "content": "main body content appropriate for the format (2-4 short paragraphs, or bullet-friendly copy)",
  "callToAction": "one clear, actionable CTA",
  "visualDirection": "description of imagery/design that is calm, hopeful, non-exploitative (no victims depicted, use symbolic imagery like light, hands, community)",
  "hashtags": ["array", "of", "6-8", "hashtags", "without", "the", "# sign"],
  "resources": [
    {"name": "National Human Trafficking Hotline", "description": "24/7 confidential support", "url": "https://humantraffickinghotline.org"},
    {"name": "Polaris Project", "description": "Anti-trafficking policy & support", "url": "https://polarisproject.org"}
  ]
}

Include 3-4 trusted, real resources (Polaris Project, National Human Trafficking Hotline 1-888-373-7888, DHS Blue Campaign, ECPAT, Thorn, or similar verified organizations).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${system}\n\n${prompt}`,
    });

    const text = response.text ?? "";

    // Strip potential code fences
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const parsed = JSON.parse(cleaned);
      return parsed as CampaignResult;
    } catch {
      // Try to extract JSON object
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as CampaignResult;
      throw new Error("Failed to parse AI response");
    }
  });
