// CoParent — "Ask CoParent" conversational assistant (Supabase Edge Function).
//
// Phase 2: the app sends the user's question plus a compact JSON snapshot of
// their OWN data; this function asks Claude and streams back a natural-language
// answer. The Anthropic API key lives only here (set as a Supabase secret), so
// it is never shipped in the app.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy assistant
//
// The on-device engine (src/lib/assistant.ts) remains the offline fallback;
// this upgrades free-form questions when the user is online + Pro.

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6"; // fast + cheap enough for Q&A

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const SYSTEM = `You are CoParent's in-app assistant. Answer the parent's question
using ONLY the JSON context provided (their calendar, kids' info, expenses,
messages, packing list). Be concise and warm. If the answer isn't in the data,
say so plainly. Never invent schedule, medical, or financial details.`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { question, context } = await req.json();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      // Cache the (stable) system prompt so repeated questions are cheaper.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Context (the user's data as JSON):\n${JSON.stringify(context)}\n\nQuestion: ${question}`,
        },
      ],
    });
    const text = resp.content.map((c) => ("text" in c ? c.text : "")).join("");
    return new Response(JSON.stringify({ answer: text }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
