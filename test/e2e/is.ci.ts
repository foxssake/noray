/**
 * Return true if we're running in CI
 */
export function isCI(): boolean {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS);
}
