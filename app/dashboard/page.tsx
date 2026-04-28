"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSessions, getWeakestCategory, Session } from "@/lib/sessions";

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

const TYPE_LABELS: Record<string, string> = {
  behavioral:     "Behavioral",
  product_design: "Product Design",
  technical:      "Technical",
};

const TYPE_COLORS: Record<string, string> = {
  behavioral:     "bg-violet-50 text-violet-700 border-violet-200",
  product_design: "bg-blue-50 text-blue-700 border-blue-200",
  technical:      "bg-orange-50 text-orange-700 border-orange-200",
};

function scoreBadgeColor(score: number) {
  if (score >= 8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function scoreBarColor(score: number) {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-400";
  return "bg-red-400";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

// ── SVG Line Chart ──────────────────────────────────────────────
function LineChart({ sessions }: { sessions: Session[] }) {
  const W = 600, H = 220;
  const PAD = { top: 16, right: 24, bottom: 44, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const data = [...sessions].reverse().slice(-10);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-36 text-slate-400 text-sm">
        Submit at least 2 answers to see your trend.
      </div>
    );
  }

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const yOf = (score: number) => PAD.top + innerH - (score / 10) * innerH;

  const points = data.map((s, i) => ({
    x: xOf(i),
    y: yOf(s.avgScore),
    score: s.avgScore,
    label: formatDateShort(s.date),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `${points[0].x},${PAD.top + innerH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${PAD.top + innerH}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      <defs>
        <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={yOf(v)} x2={PAD.left + innerW} y2={yOf(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD.left - 10} y={yOf(v) + 4} textAnchor="end" fontSize="12" fill="#94a3b8">{v}</text>
        </g>
      ))}
      <polygon points={area} fill="url(#chartArea)" />
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="white" strokeWidth="2" />
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={H - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">{p.label}</text>
      ))}
    </svg>
  );
}

// ── Expanded session detail ──────────────────────────────────────
function SessionDetail({ session }: { session: Session }) {
  return (
    <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-6">
      {/* Question */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question</p>
        <p className="text-sm text-slate-800 font-medium">{session.question}</p>
      </div>

      {/* Answer */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Answer</p>
        {session.answer ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white border border-slate-200 rounded-xl px-4 py-3">
            {session.answer}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">Answer not recorded for this session.</p>
        )}
      </div>

      {/* Feedback */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feedback</p>
        {session.dims.map((dim) => (
          <div key={dim.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{DIM_ICONS[dim.label] ?? "📌"}</span>
                <span className="text-sm font-semibold text-slate-800">{dim.label}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreBadgeColor(dim.score)}`}>
                {dim.score}/10
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${scoreBarColor(dim.score)}`}
                style={{ width: `${dim.score * 10}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{dim.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────
export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const recent = sessions.slice(0, 10);
  const weakest = sessions.length > 0 ? getWeakestCategory(sessions) : null;

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Progress Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {sessions.length === 0
                ? "No sessions yet — go practice!"
                : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} tracked`}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Practice
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-700 font-semibold">No sessions yet</p>
            <p className="text-slate-400 text-sm mt-1">Submit your first answer to start tracking progress.</p>
            <Link
              href="/"
              className="mt-5 inline-block bg-slate-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-700 transition"
            >
              Start Practicing
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Weakest Category */}
            {weakest && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm px-6 py-5 flex items-center gap-4">
                <div className="text-3xl">{DIM_ICONS[weakest.label] ?? "📌"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Focus area</p>
                  <p className="text-lg font-bold text-amber-900">{weakest.label}</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Your average score here is <strong>{weakest.avg}/10</strong> — the lowest across all your sessions.
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-3xl font-bold text-amber-700">{weakest.avg}</div>
                  <div className="text-xs text-amber-500 font-medium">/ 10</div>
                </div>
              </div>
            )}

            {/* Line Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 pt-5 pb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Average Score Over Time</h2>
              <LineChart sessions={sessions} />
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Recent Sessions</h2>
                <p className="text-xs text-slate-400">Click any row to expand</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scores</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s) => (
                      <>
                        <tr
                          key={s.id}
                          onClick={() => toggleRow(s.id)}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer ${expandedId === s.id ? "bg-slate-50" : ""}`}
                        >
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(s.date)}</td>
                          <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{s.company}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLORS[s.questionType] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {TYPE_LABELS[s.questionType] ?? s.questionType}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-700 max-w-xs">
                            <span className="block truncate" title={s.question}>{s.question}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {s.dims.map((d) => (
                                <span
                                  key={d.label}
                                  title={d.label}
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreBadgeColor(d.score)}`}
                                >
                                  {DIM_ICONS[d.label] ?? "📌"} {d.score}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-full border ${scoreBadgeColor(s.avgScore)}`}>
                              {s.avgScore}/10
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 inline-block ${expandedId === s.id ? "rotate-180" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {expandedId === s.id && (
                          <tr key={`${s.id}-detail`}>
                            <td colSpan={7} className="p-0">
                              <SessionDetail session={s} />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
