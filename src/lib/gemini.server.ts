import { GoogleGenAI } from "@google/genai";

// Server-only Gemini wrapper. The .server.ts suffix keeps the API keys and
// SDK out of the client bundle.

const MODEL = "gemini-2.5-flash";

const REPORT_SYSTEM_PROMPT = `You are an expert product analyst for "Verdikt", a brutally honest product review app.

When given a product (by name, description, or photo), research it and respond with ONLY a single JSON object (no markdown fences, no commentary) matching this exact shape:

{
  "title": "Product Name",
  "category": "Product category",
  "score": 0-100,
  "verdict": "Buy" | "Consider" | "Skip",
  "summary": "2-3 sentence overview of what the product is and who it's for",
  "pros": ["short pro 1", "short pro 2", "short pro 3"],
  "cons": ["short con 1", "short con 2"]
}

Use web search to find current pricing, reviews, and real user feedback. Be honest and balanced. "Buy" generally means score >= 80, "Consider" means 60-79, "Skip" means below 60 — but use judgment based on the overall picture. Output ONLY the JSON object, nothing else.`;

const FOLLOWUP_SYSTEM_PROMPT = `You are a helpful product assistant for "Verdikt". The user has already received a full report on a product and may now ask follow-up questions. Answer conversationally and helpfully using markdown formatting (headers, bold, lists) where it aids clarity. Use web search if the question needs current info.`;

export type ReportResult = {
    title: string;
    category: string;
    score: number;
    verdict: "Buy" | "Consider" | "Skip";
    summary: string;
    pros: string[];
    cons: string[];
};

export type GeminiHistoryEntry = {
    role: "user" | "model";
    parts: { text: string }[];
};

function getClients() {
    const primaryKey = process.env.GEMINI_API_KEY;
    const backupKey = process.env.BACKUP_API_KEY;
    if (!primaryKey) throw new Error("GEMINI_API_KEY env var is not set");

    const primary = new GoogleGenAI({ apiKey: primaryKey });
    const backup = backupKey ? new GoogleGenAI({ apiKey: backupKey }) : undefined;
    return { primary, backup };
}

function isRateLimitError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

function parseImageDataUrl(input: string): { mimeType: string; data: string } {
    const match = input.match(/^data:([^;]+);base64,(.*)$/s);
    if (match) return { mimeType: match[1], data: match[2] };
    if (input.startsWith("/9j/")) return { mimeType: "image/jpeg", data: input };
    if (input.startsWith("iVBORw0KGgo")) return { mimeType: "image/png", data: input };
    return { mimeType: "image/jpeg", data: input };
}

async function generate(
    client: GoogleGenAI,
    systemPrompt: string,
    history: GeminiHistoryEntry[],
    query: string,
    imageBase64?: string,
) {
    const userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
    if (imageBase64) {
        const { mimeType, data } = parseImageDataUrl(imageBase64);
        userParts.push({ inlineData: { mimeType, data } });
    }
    userParts.push({ text: query });

    const contents = [...history, { role: "user" as const, parts: userParts }];

    return client.models.generateContent({
        model: MODEL,
        contents,
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            tools: [{ googleSearch: {} }],
        },
    });
}

async function generateWithFallback(
    systemPrompt: string,
    history: GeminiHistoryEntry[],
    query: string,
    imageBase64?: string,
) {
    const { primary, backup } = getClients();
    try {
        return await generate(primary, systemPrompt, history, query, imageBase64);
    } catch (err) {
        if (isRateLimitError(err) && backup) {
            return await generate(backup, systemPrompt, history, query, imageBase64);
        }
        throw err;
    }
}

function extractText(response: Awaited<ReturnType<typeof generate>>): string {
    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    return text;
}

function extractSources(response: Awaited<ReturnType<typeof generate>>): { title: string; uri: string }[] {
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!chunks) return [];
    const sources: { title: string; uri: string }[] = [];
    for (const chunk of chunks) {
        if (chunk.web?.uri) {
            sources.push({ title: chunk.web.title ?? chunk.web.uri, uri: chunk.web.uri });
        }
    }
    return sources;
}

function parseReportJson(text: string): ReportResult {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
        typeof parsed.title !== "string" ||
        typeof parsed.score !== "number" ||
        typeof parsed.verdict !== "string" ||
        !Array.isArray(parsed.pros) ||
        !Array.isArray(parsed.cons)
    ) {
        throw new Error("Malformed report JSON from AI");
    }

    return {
        title: parsed.title,
        category: parsed.category ?? "",
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        verdict: ["Buy", "Consider", "Skip"].includes(parsed.verdict) ? parsed.verdict : "Consider",
        summary: parsed.summary ?? "",
        pros: parsed.pros.map(String),
        cons: parsed.cons.map(String),
    };
}

export async function generateReport(query: string, imageBase64?: string): Promise<{
    raw: string;
    report: ReportResult;
    sources: { title: string; uri: string }[];
}> {
    const enhancedPrompt = imageBase64
        ? `${query}\n\n[An image of the product has been provided above for analysis.]`
        : query;
    const response = await generateWithFallback(REPORT_SYSTEM_PROMPT, [], enhancedPrompt, imageBase64);
    const raw = extractText(response);
    const report = parseReportJson(raw);
    const sources = extractSources(response);
    return { raw, report, sources };
}

export async function generateFollowup(
    history: GeminiHistoryEntry[],
    query: string,
    imageBase64?: string,
): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    const response = await generateWithFallback(FOLLOWUP_SYSTEM_PROMPT, history, query, imageBase64);
    const text = extractText(response);
    const sources = extractSources(response);
    return { text, sources };
}
