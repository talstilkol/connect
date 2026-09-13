/** Interpret the admin form's datetime-local value as the explicitly labelled UTC time. */
export function canonicalUtcDateTime(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
  ) {
    return null;
  }

  // Browsers omit :00 seconds when normalizing datetime-local controls.
  const timestamp = `${value.length === 16 ? `${value}:00` : value}.000Z`;
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === timestamp
    ? timestamp
    : null;
}
