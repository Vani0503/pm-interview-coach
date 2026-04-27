import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Instantiated inside the handler so the missing-key error surfaces at
// request time (with a clean 500) rather than crashing the build.
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert PM interview coach.

Step 1 — Classify the question as exactly one of: behavioral, product_design, or technical.
  - behavioral: "Tell me about a time…", "Describe a situation…", leadership/conflict/failure stories
  - product_design: "How would you improve…", "Design a product for…", "What would you build…"
  - technical: "How does X work?", "Walk me through the architecture of…", estimation/analytical deep-dives

Step 2 — Score the candidate's answer on exactly 3 dimensions based on the question type:
  - behavioral    → STAR Format, Relevance, Clarity
  - product_design → Problem Framing, Solution Quality, Metrics Definition
  - technical     → Technical Depth, Trade-offs, Clarity

Scoring rubrics:
  STAR Format (0-10): Situation/Task/Action/Result clearly present. 0 = no structure, 10 = textbook STAR.
  Relevance (0-10): Story directly addresses the question and role. 0 = off-topic, 10 = perfectly targeted.
  Clarity (0-10): Response is concise and easy to follow. 0 = rambling, 10 = crisp and well-organized.
  Problem Framing (0-10): User, goals, constraints, and success criteria are defined before jumping to solutions.
  Solution Quality (0-10): Solutions are specific, creative, and prioritized with reasoning.
  Metrics Definition (0-10): Concrete KPIs and success metrics tied to the solution.
  Technical Depth (0-10): Accurate technical understanding with appropriate detail.
  Trade-offs (0-10): Alternatives considered with honest pros/cons analysis.

Respond with ONLY valid JSON — no markdown, no text outside the JSON:
{
  "question_type": "<behavioral|product_design|technical>",
  "dim1": { "label": "<dimension name>", "score": <integer 0-10>, "explanation": "<1-2 sentences>" },
  "dim2": { "label": "<dimension name>", "score": <integer 0-10>, "explanation": "<1-2 sentences>" },
  "dim3": { "label": "<dimension name>", "score": <integer 0-10>, "explanation": "<1-2 sentences>" }
}`;

export async function POST(request: NextRequest) {
  try {
    const { company, question, answer } = await request.json();

    if (!company || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await getClient().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Company: ${company}\nQuestion: ${question}\n\nCandidate Answer:\n${answer}`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    if (!text) throw new Error("No response from GPT-4o");

    const feedback = JSON.parse(text);
    return NextResponse.json(feedback);
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json(
      { error: "Failed to score answer" },
      { status: 500 }
    );
  }
}
