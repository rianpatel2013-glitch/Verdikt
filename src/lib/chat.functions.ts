import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabase, type ChatRow, type MessageRow } from "./supabase.server";
import { generateFollowup, generateReport, type GeminiHistoryEntry, type ReportResult } from "./gemini.server";

// ─── Shapes returned to the client ──────────────────────────────────────────

export type ChatSummary = {
    id: string;
    name: string;
    createdAt: string;
};

export type ChatMessageDTO =
    | { role: "user"; text: string; image?: string }
    | { role: "model"; kind: "report"; report: ReportResult; sources: { title: string; uri: string }[] }
    | { role: "model"; kind: "text"; text: string; sources: { title: string; uri: string }[] };

type Source = { title: string; uri: string };

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * User message rows are stored as JSON: { text: string, image: string | null }.
 * Safely extracts both fields, falling back to the raw string as `text`
 * for any legacy rows stored as plain text before this shape existed.
 */
function parseUserContent(content: string): { text: string; image?: string } {
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
            return {
                text: typeof parsed.text === "string" ? parsed.text : content,
                image: typeof parsed.image === "string" ? parsed.image : undefined,
            };
        }
    } catch {
        // Not JSON — treat as a legacy plain-text row.
    }
    return { text: content };
}

/**
 * Model message rows are stored as JSON in one of two shapes:
 *   - Report:   { report: ReportResult, sources: Source[] }
 *   - Text:     { text: string, sources: Source[] }
 *
 * `isReportRow` indicates whether this is the chat's first model row
 * (index 1), which is the only row that could be a legacy raw-report
 * JSON blob with no wrapper at all.
 */
function parseModelContent(
    content: string,
    isReportRow: boolean,
):
    | { kind: "report"; report: ReportResult; sources: Source[] }
    | { kind: "text"; text: string; sources: Source[] } {
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
            const sources: Source[] = Array.isArray(parsed.sources) ? parsed.sources : [];

            if (parsed.report && typeof parsed.report === "object") {
                return { kind: "report", report: parsed.report as ReportResult, sources };
            }

            if (typeof parsed.text === "string") {
                return { kind: "text", text: parsed.text, sources };
            }

            // Legacy: first model row stored as a raw report object with no wrapper.
            if (isReportRow && typeof parsed.title === "string" && typeof parsed.score === "number") {
                return { kind: "report", report: parsed as ReportResult, sources: [] };
            }
        }
    } catch {
        // Not JSON — legacy plain-text follow-up row.
    }

    return { kind: "text", text: content, sources: [] };
}

/** Flattens a model row's stored content down to plain text for Gemini history. */
function modelContentToHistoryText(content: string): string {
    const parsed = parseModelContent(content, false);
    if (parsed.kind === "report") {
        return JSON.stringify(parsed.report);
    }
    return parsed.text;
}

// ─── List chats for the sidebar ─────────────────────────────────────────────

export const listChats = createServerFn({ method: "GET" })
    .validator(z.object({ userEmail: z.string().email().optional() }))
    .handler(async ({ data }): Promise<ChatSummary[]> => {
        if (!data.userEmail) return [];

        const supabase = getSupabase();
        const { data: rows, error } = await supabase
            .from("chats")
            .select("id, name, created_at")
            .eq("user_email", data.userEmail)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return (rows as Pick<ChatRow, "id" | "name" | "created_at">[]).map((r) => ({
            id: r.id,
            name: r.name,
            createdAt: r.created_at,
        }));
    });

// ─── Load a chat's message history ──────────────────────────────────────────

export const getChatMessages = createServerFn({ method: "GET" })
    .validator(z.object({ chatId: z.string().uuid() }))
    .handler(async ({ data }): Promise<ChatMessageDTO[]> => {
        const supabase = getSupabase();
        const { data: rows, error } = await supabase
            .from("messages")
            .select("role, content")
            .eq("chat_id", data.chatId)
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);

        const messages: ChatMessageDTO[] = [];
        for (const [i, row] of (rows as Pick<MessageRow, "role" | "content">[]).entries()) {
            if (row.role === "user") {
                const { text, image } = parseUserContent(row.content);
                messages.push({ role: "user", text, image });
            } else {
                // Second row overall (index 1) is the first model response — the report.
                const parsed = parseModelContent(row.content, i === 1);
                if (parsed.kind === "report") {
                    messages.push({ role: "model", kind: "report", report: parsed.report, sources: parsed.sources });
                } else {
                    messages.push({ role: "model", kind: "text", text: parsed.text, sources: parsed.sources });
                }
            }
        }
        return messages;
    });

// ─── Send a message (new chat or follow-up) ─────────────────────────────────

const sendMessageInput = z.object({
    prompt: z.string(),
    chatId: z.string().uuid().nullable(),
    userEmail: z.string().email().optional(),
    image: z.string().optional(),
});

export const sendMessage = createServerFn({ method: "POST" })
    .validator(sendMessageInput)
    .handler(async ({ data }) => {
        const { prompt, chatId, userEmail, image } = data;
        const supabase = getSupabase();
        const saveToDb = Boolean(userEmail);

        // ── New chat: generate structured report ──────────────────────────────
        if (!chatId) {
            const { report, sources } = await generateReport(prompt, image);

            const newChatId = crypto.randomUUID();
            const title = report.title?.trim() || prompt.trim().slice(0, 50) || "Product Research";

            if (saveToDb) {
                const userContent = JSON.stringify({ text: prompt, image: image ?? null });
                const modelContent = JSON.stringify({ report, sources });

                const { error: chatErr } = await (supabase.from("chats") as any).insert({
                    id: newChatId,
                    user_email: userEmail!,
                    name: title,
                });
                if (chatErr) throw new Error(chatErr.message);

                const { error: msgErr } = await (supabase.from("messages") as any).insert([
                    { chat_id: newChatId, role: "user", content: userContent },
                    { chat_id: newChatId, role: "model", content: modelContent },
                ]);
                if (msgErr) throw new Error(msgErr.message);
            }

            return {
                chatId: newChatId,
                title,
                message: { role: "model", kind: "report", report, sources } as const,
            };
        }

        // ── Follow-up: load history, generate text response ───────────────────
        let history: GeminiHistoryEntry[] = [];
        if (saveToDb) {
            const { data: rows, error } = await supabase
                .from("messages")
                .select("role, content")
                .eq("chat_id", chatId)
                .order("created_at", { ascending: true });
            if (error) throw new Error(error.message);

            history = (rows as Pick<MessageRow, "role" | "content">[]).map((r) => {
                const text =
                    r.role === "user"
                        ? parseUserContent(r.content).text
                        : modelContentToHistoryText(r.content);
                return {
                    role: r.role,
                    parts: [{ text }],
                };
            });
        }

        const { text, sources } = await generateFollowup(history, prompt, image);

        if (saveToDb) {
            const userContent = JSON.stringify({ text: prompt, image: image ?? null });
            const modelContent = JSON.stringify({ text, sources });
            const { error: msgErr } = await (supabase.from("messages") as any).insert([
                { chat_id: chatId, role: "user", content: userContent },
                { chat_id: chatId, role: "model", content: modelContent },
            ]);
            if (msgErr) throw new Error(msgErr.message);
        }

        return {
            chatId,
            title: null,
            message: { role: "model", kind: "text", text, sources } as const,
        };
    });

// ─── Delete a chat ───────────────────────────────────────────────────────────

export const deleteChat = createServerFn({ method: "POST" })
    .validator(z.object({ chatId: z.string().uuid() }))
    .handler(async ({ data }) => {
        const supabase = getSupabase();
        const { error } = await supabase.from("chats").delete().eq("id", data.chatId);
        if (error) throw new Error(error.message);
        return { ok: true };
    });