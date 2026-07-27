export function isHttpsUrlCandidate(value: string): boolean {
  try {
    const parsedUrl = new URL(value.trim());
    return parsedUrl.protocol === "https:" && parsedUrl.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isPhoneNumberCandidate(value: string): boolean {
  return /^\+?[0-9]+$/.test(value.trim());
}

export function isDynamicHttpsUrlCandidate(value: string): boolean {
  const trimmedValue = value.trim();
  const variableMatches = trimmedValue.match(/\{\{1\}\}/g) ?? [];
  const withoutSupportedVariable = trimmedValue.replace("{{1}}", "1");

  return (
    variableMatches.length === 1 &&
    !withoutSupportedVariable.includes("{{") &&
    !withoutSupportedVariable.includes("}}") &&
    isHttpsUrlCandidate(withoutSupportedVariable)
  );
}

export function applyDynamicUrlExample(
  value: string,
  example: string,
): string {
  return value.replace("{{1}}", example.trim());
}
