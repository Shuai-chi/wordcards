export function formatStatDisplay(value: number): string {
  return value >= 1000 ? '999+' : String(Math.max(0, value));
}
