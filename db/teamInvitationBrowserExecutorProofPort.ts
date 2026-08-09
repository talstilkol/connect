import type {
  D1DatabaseBinding,
} from "./d1.ts";
import {
  createTeamInvitationBrowserProofReader,
} from "./teamInvitationBrowserProofReader.ts";

export type TeamInvitationBrowserExecutorProofPortErrorCode =
  | "ABORTED";

export class TeamInvitationBrowserExecutorProofPortError
  extends Error {
  readonly code:
    TeamInvitationBrowserExecutorProofPortErrorCode;

  constructor(
    code:
      TeamInvitationBrowserExecutorProofPortErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserExecutorProofPortError";
    this.code = code;
  }
}

export function createTeamInvitationBrowserExecutorProofPort(
  database: D1DatabaseBinding,
) {
  const reader =
    createTeamInvitationBrowserProofReader(
      database,
    );

  return Object.freeze({
    async readDatabaseProof(
      input: unknown,
      signal: AbortSignal,
    ) {
      if (signal.aborted) {
        throw new TeamInvitationBrowserExecutorProofPortError(
          "ABORTED",
        );
      }

      const proof = await reader.read(input);

      if (signal.aborted) {
        throw new TeamInvitationBrowserExecutorProofPortError(
          "ABORTED",
        );
      }

      return proof;
    },
  });
}
