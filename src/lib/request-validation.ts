export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.keys(value).length <= 100 && Object.values(value).every(item => typeof item === 'boolean')
}
