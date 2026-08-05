import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

test("declares a dedicated invitation queue with bounded retries and a DLQ", async () => {
  const configuration =
    await readFile(
      new URL(
        "../vite.config.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.match(
    configuration,
    /binding: "TEAM_INVITATION_QUEUE"/,
  );
  assert.match(
    configuration,
    /queue: "connect-team-invitations"/,
  );
  assert.match(
    configuration,
    /dead_letter_queue:\s*"connect-team-invitations-dlq"/,
  );
});

test("routes invitation deliveries through the unavailable provider without opening React", async () => {
  const [
    worker,
    component,
  ] = await Promise.all([
    readFile(
      new URL(
        "../worker/index.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/team/TeamDirectory.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(
    worker,
    /batch\.queue ===\s+TEAM_INVITATION_QUEUE_NAME/,
  );
  assert.match(
    worker,
    /createTeamInvitationQueueBatchHandler/,
  );
  assert.match(
    worker,
    /createUnavailableTeamInvitationProvider/,
  );
  assert.doesNotMatch(
    component,
    /TEAM_INVITATION_QUEUE|inviteTeamMemberAction/,
  );
});
