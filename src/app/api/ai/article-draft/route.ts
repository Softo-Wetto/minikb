import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/pocketbase/server";

type DraftRequest = {
  prompt?: unknown;
  existing?: {
    title?: unknown;
    summary?: unknown;
    content?: unknown;
    category?: unknown;
    tags?: unknown;
  };
};

type ArticleDraft = {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  return JSON.parse(jsonText) as Partial<ArticleDraft>;
}

function htmlFromText(value: string) {
  if (/<[a-z][\s\S]*>/i.test(value)) return value;

  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeHtml(value: string) {
  return htmlFromText(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\son\w+=\S+/gi, "");
}

function normalizeDraft(value: Partial<ArticleDraft>): ArticleDraft {
  return {
    title: cleanString(value.title).slice(0, 120),
    summary: cleanString(value.summary).slice(0, 320),
    content: sanitizeHtml(cleanString(value.content) || "<p></p>"),
    category: cleanString(value.category).slice(0, 80) || "General",
    tags: Array.isArray(value.tags)
      ? value.tags
          .map((tag) => cleanString(tag).slice(0, 40))
          .filter(Boolean)
          .slice(0, 8)
      : [],
  };
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user || !["admin", "editor"].includes(user.role)) {
    return NextResponse.json({ error: "You must be signed in as an editor." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as DraftRequest | null;
  const prompt = cleanString(body?.prompt);

  if (prompt.length < 4) {
    return NextResponse.json({ error: "Please enter a more detailed prompt." }, { status: 400 });
  }

  const existing = body?.existing || {};
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You write practical IT knowledge base articles for MiniKB. Return only valid JSON with title, summary, content, category, and tags. The content field must be a clean HTML fragment for a rich text editor. Use h2, h3, p, ul, ol, li, blockquote, pre, code, strong, and em when useful. Do not include scripts, styles, markdown fences, or external tracking content.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            existing: {
              title: cleanString(existing.title),
              summary: cleanString(existing.summary),
              content: cleanString(existing.content).slice(0, 4000),
              category: cleanString(existing.category),
              tags: Array.isArray(existing.tags) ? existing.tags : cleanString(existing.tags),
            },
          }),
        },
      ],
      max_output_tokens: 2200,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || `AI request failed with status ${response.status}.` },
      { status: 502 }
    );
  }

  try {
    const draft = normalizeDraft(parseJsonObject(extractOutputText(data)));

    if (!draft.title || !draft.content) {
      return NextResponse.json({ error: "The AI response was missing article content." }, { status: 502 });
    }

    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "The AI response could not be parsed." }, { status: 502 });
  }
}
