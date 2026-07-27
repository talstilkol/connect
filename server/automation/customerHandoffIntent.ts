const EXACT_HANDOFF_REQUESTS = new Set([
  "נציג",
  "נציג אנושי",
  "העבר לנציג",
  "אני רוצה נציג",
  "agent",
  "human agent",
]);

const MAXIMUM_MESSAGE_LENGTH = 4_096;

export function customerRequestedHuman(
  textContent: string | null,
): boolean {
  if (
    textContent === null ||
    typeof textContent !== "string" ||
    textContent.length >
      MAXIMUM_MESSAGE_LENGTH
  ) {
    return false;
  }

  const normalized = textContent
    .trim()
    .toLocaleLowerCase("he-IL")
    .replace(/\s+/g, " ");

  return EXACT_HANDOFF_REQUESTS.has(
    normalized,
  );
}
