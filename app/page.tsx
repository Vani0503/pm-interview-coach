"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { saveSession, loadSessions } from "@/lib/sessions";

const COMPANIES = ["Google", "Meta", "Amazon", "Microsoft"] as const;
type Company = (typeof COMPANIES)[number];

type QuestionType = "behavioral" | "product_design" | "technical";

type DimScore = { label: string; score: number; explanation: string };
type Feedback = {
  question_type: QuestionType;
  dim1: DimScore;
  dim2: DimScore;
  dim3: DimScore;
};

type PageState = "idle" | "loading" | "done" | "error";

const DRAFT_KEY = "pm_coach_draft";

const TYPE_META: Record<QuestionType, { label: string; badge: string; color: string }> = {
  behavioral:    { label: "Behavioral",     badge: "🗣️", color: "bg-violet-50 text-violet-700 border-violet-200" },
  product_design:{ label: "Product Design", badge: "🎨", color: "bg-blue-50 text-blue-700 border-blue-200" },
  technical:     { label: "Technical",      badge: "⚙️", color: "bg-orange-50 text-orange-700 border-orange-200" },
};

const DIM_ICONS: Record<string, string> = {
  "STAR Format":        "⭐",
  "Relevance":          "🎯",
  "Clarity":            "💡",
  "Problem Framing":    "🔭",
  "Solution Quality":   "🛠️",
  "Metrics Definition": "📊",
  "Technical Depth":    "🔬",
  "Trade-offs":         "⚖️",
};

function scoreBarColor(score: number) {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-400";
  return "bg-red-400";
}

function scoreBadgeColor(score: number) {
  if (score >= 8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function Home() {
  const [company, setCompany] = useState<Company | "">("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<PageState>("idle");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore draft from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.company) setCompany(d.company);
        if (d.question) setQuestion(d.question);
        if (d.answer) setAnswer(d.answer);
        if (d.feedback) {
          setFeedback(d.feedback);
          setState("done");
        }
      }
    } catch {}
    setSessionCount(loadSessions().length);
    setDraftLoaded(true);
  }, []);

  // Persist draft whenever form content changes (after initial restore)
  useEffect(() => {
    if (!draftLoaded) return;
    if (!company && !question && !answer && !feedback) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ company, question, answer, feedback }));
  }, [draftLoaded, company, question, answer, feedback]);

  const canSubmit = company !== "" && question.trim() !== "" && answer.trim() !== "";
  const isLocked = state === "loading" || state === "done";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isLocked) return;

    setState("loading");
    setFeedback(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, question, answer }),
      });
      if (!res.ok) throw new Error("API error");
      const data: Feedback = await res.json();
      setFeedback(data);
      setState("done");
      saveSession({
        company,
        question,
        answer,
        questionType: data.question_type,
        dims: [data.dim1, data.dim2, data.dim3],
        avgScore: Math.round(
          (data.dim1.score + data.dim2.score + data.dim3.score) / 3
        ),
      });
      setSessionCount(loadSessions().length);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  }

  function handleReset() {
    setCompany("");
    setQuestion("");
    setAnswer("");
    setState("idle");
    setFeedback(null);
    setErrorMsg("");
    localStorage.removeItem(DRAFT_KEY);
  }

  const dims = feedback ? [feedback.dim1, feedback.dim2, feedback.dim3] : [];
  const avgScore = dims.length
    ? Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)
    : null;
  const typeMeta = feedback ? TYPE_META[feedback.question_type] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-500 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
              PM Interview Coach
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Dashboard
              {sessionCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {sessionCount}
                </span>
              )}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight inline-flex items-center gap-2">
            Practice Your Interview Answer
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 align-middle">Beta</span>
          </h1>
          <p className="mt-2 text-slate-500 text-base">
            Submit your answer and get instant AI feedback.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
            {/* Company selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Company</label>
              <div className="relative">
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value as Company | "")}
                  disabled={isLocked}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>Select a company…</option>
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Question input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Interview Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isLocked}
                placeholder="e.g. Tell me about a time you dealt with a difficult stakeholder."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Answer textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Your Answer</label>
                <span className="text-xs text-slate-400">{answer.length} chars</span>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={isLocked}
                placeholder="Write your answer here. Use STAR for behavioral, CIRCLES for product design, or your own framework…"
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit / loading */}
            {state !== "done" && (
              <button
                type="submit"
                disabled={!canSubmit || state === "loading"}
                className={`mt-1 w-full py-3 px-6 rounded-xl text-white text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center justify-center gap-2 ${
                  canSubmit && state === "idle"
                    ? "bg-slate-900 hover:bg-slate-700 shadow-sm cursor-pointer"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {state === "loading" ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Analyzing your answer…
                  </>
                ) : (
                  "Submit Answer"
                )}
              </button>
            )}

            {/* Error */}
            {state === "error" && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{errorMsg}</p>
                <button type="button" onClick={() => setState("idle")} className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 cursor-pointer">
                  Retry
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Feedback panel */}
        {state === "done" && feedback && typeMeta && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 pt-7 pb-2 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Feedback</h2>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeMeta.color}`}>
                    {typeMeta.badge} {typeMeta.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{company} — {question}</p>
              </div>
              {avgScore !== null && (
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${scoreBadgeColor(avgScore)} border-current`}>
                  <span className="text-2xl font-bold leading-none">{avgScore}</span>
                  <span className="text-xs font-medium opacity-70">avg</span>
                </div>
              )}
            </div>

            <div className="px-8 pb-8 flex flex-col gap-5 mt-5">
              {dims.map((dim) => (
                <div key={dim.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{DIM_ICONS[dim.label] ?? "📌"}</span>
                      <span className="text-sm font-semibold text-slate-800">{dim.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreBadgeColor(dim.score)}`}>
                      {dim.score}/10
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${scoreBarColor(dim.score)}`}
                      style={{ width: `${dim.score * 10}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{dim.explanation}</p>
                </div>
              ))}

              <div className="mt-2 flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  New Question
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition text-center"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Practice makes perfect — keep going.
        </p>
      </div>
    </div>
  );
}
