import {
  createTeamInvitationQueueMessage,
  type TeamInvitationQueueMessage,
} from "./teamInvitationQueueMessage.ts";

export interface TeamInvitationQueueBinding {
  send(
    body: TeamInvitationQueueMessage,
    options: {
      contentType: "json";
    },
  ): Promise<unknown>;
}

export class TeamInvitationQueuePublisherError
  extends Error {
  constructor() {
    super(
      "The team invitation could not be queued",
    );
    this.name =
      "TeamInvitationQueuePublisherError";
  }
}

export function createTeamInvitationQueuePublisher(
  queue: TeamInvitationQueueBinding,
) {
  if (
    !queue ||
    typeof queue.send !== "function"
  ) {
    throw new Error(
      "TEAM_INVITATION_QUEUE binding must be configured",
    );
  }

  return {
    async publish(
      tenantId: unknown,
      deliveryKey: unknown,
    ): Promise<{
      outcome: "queued";
    }> {
      let message:
        TeamInvitationQueueMessage;

      try {
        message =
          createTeamInvitationQueueMessage(
            tenantId,
            deliveryKey,
          );
      } catch {
        throw new TeamInvitationQueuePublisherError();
      }

      try {
        await queue.send(
          message,
          {
            contentType: "json",
          },
        );
      } catch {
        throw new TeamInvitationQueuePublisherError();
      }

      return {
        outcome: "queued",
      };
    },
  };
}
