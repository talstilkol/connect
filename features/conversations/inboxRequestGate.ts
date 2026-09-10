export interface InboxRequestGate { current: boolean }

/** Shared by reads and mutations; acquired synchronously before an async action starts. */
export function acquireInboxRequest(gate: InboxRequestGate): (() => void) | null {
  if (gate.current) return null;
  gate.current = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    gate.current = false;
  };
}
