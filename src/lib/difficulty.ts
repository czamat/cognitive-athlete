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

export interface ProcessingSpeedConfig {
  displayTimeMs: number;
  symbolCount: number;
  similarityLevel: number;
}

export function getProcessingSpeedConfig(difficulty: number): ProcessingSpeedConfig {
  return {
    displayTimeMs: Math.max(200, 800 - (difficulty - 1) * 65),
    symbolCount: 4,
    similarityLevel: Math.min(difficulty, 5),
  };
}

export interface AttentionConfig {
  totalDots: number;
  targetDots: number;
  movementSpeed: number;
  trackingDurationMs: number;
}

export function getAttentionConfig(difficulty: number): AttentionConfig {
  return {
    totalDots: 6 + Math.floor(difficulty * 0.8),
    targetDots: 2 + Math.floor(difficulty * 0.3),
    movementSpeed: 1 + difficulty * 0.4,
    trackingDurationMs: 3000 + difficulty * 300,
  };
}

export interface MemoryConfig {
  sequenceLength: number;
  displayTimePerItemMs: number;
  delayMs: number;
  hasDualTask: boolean;
}

export function getMemoryConfig(difficulty: number): MemoryConfig {
  return {
    sequenceLength: 3 + Math.floor(difficulty * 0.5),
    displayTimePerItemMs: Math.max(400, 1000 - difficulty * 60),
    delayMs: 2000,
    hasDualTask: difficulty >= 5,
  };
}
