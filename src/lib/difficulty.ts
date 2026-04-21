const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

export function adjustDifficulty(
  currentDifficulty: number,
  accuracy: number
): number {
  if (accuracy >= 0.85) {
    return Math.min(MAX_DIFFICULTY, currentDifficulty + 1);
  }
  if (accuracy <= 0.45) {
    return Math.max(MIN_DIFFICULTY, currentDifficulty - 1);
  }
  return currentDifficulty;
}

// Streak adds up to +2 effective difficulty levels, scaling logarithmically:
// streak 3 → +0.5, streak 7 → +1.0, streak 14 → +1.4, streak 30 → +1.8
function applyStreakBonus(baseDifficulty: number, streak: number): number {
  if (streak <= 1) return baseDifficulty;
  const bonus = Math.min(2, Math.log2(streak) * 0.5);
  return Math.min(MAX_DIFFICULTY, baseDifficulty + bonus);
}

/** Effective difficulty after streak bonus (same curve as module configs). */
export function getEffectiveDifficulty(baseDifficulty: number, streak: number): number {
  return applyStreakBonus(baseDifficulty, streak);
}

// --- Answer / input time limits (pressure); tighter at higher effective difficulty ---

export function getProcessingSpeedChoiceLimitMs(difficulty: number, streak: number = 0): number {
  const d = getEffectiveDifficulty(difficulty, streak);
  return Math.max(2200, 6600 - Math.round(d * 400));
}

export function getAttentionSelectLimitMs(difficulty: number, streak: number = 0): number {
  const d = getEffectiveDifficulty(difficulty, streak);
  return Math.max(8500, 26000 - Math.round(d * 1000));
}

export function getMemoryDualTaskLimitMs(difficulty: number, streak: number = 0): number {
  const d = getEffectiveDifficulty(difficulty, streak);
  return Math.max(4500, 14500 - Math.round(d * 780));
}

/** Recall phase: sequence length or grid cell count. */
export function getMemoryRecallLimitMs(
  difficulty: number,
  streak: number,
  itemCount: number
): number {
  const d = getEffectiveDifficulty(difficulty, streak);
  const base = 10000 + itemCount * 3000;
  return Math.max(9000, base - Math.round(d * 480));
}

export interface ProcessingSpeedConfig {
  displayTimeMs: number;
  symbolCount: number;
  similarityLevel: number;
}

export function getProcessingSpeedConfig(difficulty: number, streak: number = 0): ProcessingSpeedConfig {
  const d = applyStreakBonus(difficulty, streak);
  return {
    displayTimeMs: Math.max(200, 800 - (d - 1) * 65),
    symbolCount: 4,
    similarityLevel: Math.min(Math.round(d), 5),
  };
}

export interface AttentionConfig {
  totalDots: number;
  targetDots: number;
  movementSpeed: number;
  trackingDurationMs: number;
}

export function getAttentionConfig(difficulty: number, streak: number = 0): AttentionConfig {
  const d = applyStreakBonus(difficulty, streak);
  // Softer baseline: fewer distractors, slower motion, longer track time; still scales with d + streak.
  const totalDots = Math.min(18, 7 + Math.floor(d * 1.05));
  const targetDots = Math.min(
    Math.max(2, totalDots - 5),
    2 + Math.floor(d * 0.32)
  );
  return {
    totalDots,
    targetDots,
    movementSpeed: 1.2 + d * 0.48,
    trackingDurationMs: 3800 + Math.round(d * 340),
  };
}

export interface MemoryConfig {
  sequenceLength: number;
  displayTimePerItemMs: number;
  delayMs: number;
  hasDualTask: boolean;
}

export function getMemoryConfig(difficulty: number, streak: number = 0): MemoryConfig {
  const d = applyStreakBonus(difficulty, streak);
  return {
    sequenceLength: 3 + Math.floor(d * 0.5),
    displayTimePerItemMs: Math.max(400, 1000 - Math.round(d * 60)),
    delayMs: 2000,
    hasDualTask: d >= 5,
  };
}
