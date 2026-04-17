export interface ModuleScore {
  moduleType: "processing_speed" | "attention" | "memory";
  avgReactionTime: number;
  accuracy: number;
  difficultyLevel: number;
  roundsCompleted: number;
}

const BASELINE_REACTION_MS: Record<string, number> = {
  processing_speed: 1000,
  attention: 3000,
  memory: 5000,
};

export function calculateModuleScore(result: ModuleScore): number {
  const baseline = BASELINE_REACTION_MS[result.moduleType] || 1000;
  const speedBonus = Math.max(0.5, Math.min(2, 2 - result.avgReactionTime / baseline));
  const difficultyMultiplier = 1 + (result.difficultyLevel - 1) * 0.15;
  return Math.round(result.accuracy * 100 * speedBonus * difficultyMultiplier);
}

export function calculateCognitiveScore(moduleScores: number[]): number {
  if (moduleScores.length === 0) return 0;
  const sum = moduleScores.reduce((a, b) => a + b, 0);
  return Math.round(sum / moduleScores.length);
}

export function calculateXpGain(cognitiveScore: number): number {
  return Math.round(cognitiveScore * 1.5);
}

export function getLevelFromXp(xp: number): { level: number; currentXp: number; nextLevelXp: number } {
  let level = 1;
  let threshold = 500;
  let accumulated = 0;

  while (accumulated + threshold <= xp) {
    accumulated += threshold;
    level++;
    threshold = Math.round(threshold * 1.3);
  }

  return {
    level,
    currentXp: xp - accumulated,
    nextLevelXp: threshold,
  };
}
