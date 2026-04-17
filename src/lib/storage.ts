import { calculateModuleScore, calculateCognitiveScore, calculateXpGain, getLevelFromXp } from "./scoring";
import { adjustDifficulty } from "./difficulty";

const KEYS = {
  user: "ca_user",
  sessions: "ca_sessions",
} as const;

export interface UserProfile {
  createdAt: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  processingSpeedDifficulty: number;
  attentionDifficulty: number;
  memoryDifficulty: number;
}

export interface ModuleResultData {
  moduleType: "processing_speed" | "attention" | "memory";
  avgReactionTime: number;
  accuracy: number;
  score: number;
  difficultyLevel: number;
  roundsCompleted: number;
}

export interface SessionData {
  id: number;
  date: string;
  totalScore: number;
  cognitiveScore: number;
  modules: ModuleResultData[];
}

function getDefaultUser(): UserProfile {
  return {
    createdAt: new Date().toISOString(),
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: null,
    processingSpeedDifficulty: 1,
    attentionDifficulty: 1,
    memoryDifficulty: 1,
  };
}

export function getUser(): UserProfile {
  if (typeof window === "undefined") return getDefaultUser();
  const raw = localStorage.getItem(KEYS.user);
  if (!raw) {
    const user = getDefaultUser();
    localStorage.setItem(KEYS.user, JSON.stringify(user));
    return user;
  }
  return JSON.parse(raw);
}

function saveUser(user: UserProfile) {
  localStorage.setItem(KEYS.user, JSON.stringify(user));
}

export function getSessions(): SessionData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.sessions);
  return raw ? JSON.parse(raw) : [];
}

function saveSessions(sessions: SessionData[]) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

export interface SaveSessionInput {
  moduleType: "processing_speed" | "attention" | "memory";
  avgReactionTime: number;
  accuracy: number;
  difficultyLevel: number;
  roundsCompleted: number;
}

export interface SaveSessionResult {
  sessionId: number;
  totalScore: number;
  cognitiveScore: number;
  moduleScores: number[];
  xpGain: number;
  newStreak: number;
}

export function saveSession(modules: SaveSessionInput[]): SaveSessionResult {
  const moduleScores = modules.map((m) =>
    calculateModuleScore({
      moduleType: m.moduleType,
      avgReactionTime: m.avgReactionTime,
      accuracy: m.accuracy,
      difficultyLevel: m.difficultyLevel,
      roundsCompleted: m.roundsCompleted,
    })
  );

  const cognitiveScore = calculateCognitiveScore(moduleScores);
  const totalScore = moduleScores.reduce((a, b) => a + b, 0);

  const sessions = getSessions();
  const sessionId = sessions.length > 0 ? Math.max(...sessions.map((s) => s.id)) + 1 : 1;

  const newSession: SessionData = {
    id: sessionId,
    date: new Date().toISOString(),
    totalScore,
    cognitiveScore,
    modules: modules.map((m, i) => ({
      ...m,
      score: moduleScores[i],
    })),
  };

  sessions.push(newSession);
  saveSessions(sessions);

  const user = getUser();
  const xpGain = calculateXpGain(cognitiveScore);
  user.totalXp += xpGain;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let newStreak = 1;
  if (user.lastSessionDate) {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = user.lastSessionDate.split("-").map(Number);
    const lastDate = new Date(y, m - 1, d);
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays === 1) {
      newStreak = user.currentStreak + 1;
    } else if (diffDays === 0) {
      newStreak = Math.max(1, user.currentStreak);
    }
  }
  user.currentStreak = newStreak;
  user.longestStreak = Math.max(newStreak, user.longestStreak);
  user.lastSessionDate = today;

  const diffMap: Record<string, keyof Pick<UserProfile, "processingSpeedDifficulty" | "attentionDifficulty" | "memoryDifficulty">> = {
    processing_speed: "processingSpeedDifficulty",
    attention: "attentionDifficulty",
    memory: "memoryDifficulty",
  };

  for (const m of modules) {
    const field = diffMap[m.moduleType];
    if (field) {
      user[field] = adjustDifficulty(user[field], m.accuracy);
    }
  }

  saveUser(user);

  return { sessionId, totalScore, cognitiveScore, moduleScores, xpGain, newStreak };
}

export function getUserWithLevel() {
  const user = getUser();
  const levelInfo = getLevelFromXp(user.totalXp);
  return { ...user, ...levelInfo };
}

export function getStats() {
  const sessions = getSessions();
  const recent = sessions.slice(-14);

  const chartData = recent.map((s) => ({
    date: s.date,
    cognitive_score: s.cognitiveScore,
  }));

  const lastSession = sessions.length > 0
    ? sessions[sessions.length - 1].modules.map((m) => ({
        module_type: m.moduleType,
        avg_reaction_time: m.avgReactionTime,
        accuracy: m.accuracy,
        score: m.score,
      }))
    : [];

  return {
    chartData,
    lastSession,
    totalSessions: sessions.length,
  };
}
