import { Stage } from '../../types/environments';

/**
 * Returns a normalized stage string based on the input.
 *
 * This function checks if the provided `stage` string matches one of the known
 * environment stages defined in the `Stage` enum (`prod`, `staging`, `test`).
 * If it matches, it returns the corresponding stage string. If it doesn't match
 * any known stage, it returns the input string as-is, which is useful for
 * ephemeral environments like feature branches (e.g., `pr-123`).
 *
 * @param {string} stage - The input stage string to normalize.
 * @returns {string} - The normalized stage string, or the original input if unknown.
 */

export function getStage(stage: string): string {
  switch (stage) {
    case Stage.prod:
      return Stage.prod;
    case Stage.staging:
      return Stage.staging;
    case Stage.test:
      return Stage.test;
    default:
      return stage.toLowerCase(); // return the ephemeral environment if not known (i.e. pr-123)
  }
}
