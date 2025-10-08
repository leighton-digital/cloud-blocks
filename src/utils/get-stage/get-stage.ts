/**
 * Normalises the stage string to lowercase to ensure consistency.
 * @param stage - The deployment stage (e.g., "dev", "prod", "Feat-123").
 * @returns The normalised stage string.
 */
export function getStage(stage: string): string {
  return stage.toLowerCase().trim();
}
