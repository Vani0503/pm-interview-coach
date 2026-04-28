export type Session = {
  id: string;
  date: string;
  company: string;
  question: string;
  answer: string;
  questionType: string;
  dims: { label: string; score: number; explanation: string }[];
  avgScore: number;
};

const STORAGE_KEY = "pm_coach_sessions";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSession(data: Omit<Session, "id" | "date">): Session {
  const all = loadSessions();
  const session: Session = {
    ...data,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  all.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
  return session;
}

export function getWeakestCategory(sessions: Session[]): { label: string; avg: number } | null {
  const acc: Record<string, { total: number; count: number }> = {};
  for (const s of sessions) {
    for (const dim of s.dims) {
      if (!acc[dim.label]) acc[dim.label] = { total: 0, count: 0 };
      acc[dim.label].total += dim.score;
      acc[dim.label].count += 1;
    }
  }
  let weakest: { label: string; avg: number } | null = null;
  for (const [label, { total, count }] of Object.entries(acc)) {
    const avg = Math.round((total / count) * 10) / 10;
    if (!weakest || avg < weakest.avg) weakest = { label, avg };
  }
  return weakest;
}
