import {
  createTeamInvitationDeliveryRepository,
} from "../../db/teamInvitationDeliveryRepository.ts";
import {
  requireDatabase,
  type DatabaseEnvironment,
} from "../../db/d1.ts";
import {
  createTeamInvitationDispatchProcessor,
} from "./teamInvitationDispatchProcessor.ts";
import type {
  TeamInvitationProvider,
} from "./teamInvitationProvider.ts";
import {
  createTeamInvitationQueueConsumer,
  type TeamInvitationQueueBatch,
  type TeamInvitationQueueConsumerResult,
} from "./teamInvitationQueueConsumer.ts";
import {
  createTeamInvitationQueuePublisher,
  type TeamInvitationQueueBinding,
} from "./teamInvitationQueuePublisher.ts";

export interface TeamInvitationQueueEnvironment
  extends DatabaseEnvironment {
  TEAM_INVITATION_QUEUE?:
    TeamInvitationQueueBinding;
}

function requireQueue(
  environment:
    TeamInvitationQueueEnvironment,
): TeamInvitationQueueBinding {
  if (
    !environment.TEAM_INVITATION_QUEUE ||
    typeof environment
      .TEAM_INVITATION_QUEUE.send !==
      "function"
  ) {
    throw new Error(
      "Missing required queue binding: TEAM_INVITATION_QUEUE",
    );
  }

  return environment
    .TEAM_INVITATION_QUEUE;
}

export function createTeamInvitationPublisherFromEnvironment(
  environment:
    TeamInvitationQueueEnvironment,
) {
  return createTeamInvitationQueuePublisher(
    requireQueue(environment),
  );
}

export function createTeamInvitationQueueBatchHandler(
  environment:
    TeamInvitationQueueEnvironment,
  provider:
    TeamInvitationProvider,
): {
  handle(
    batch: TeamInvitationQueueBatch,
  ): Promise<TeamInvitationQueueConsumerResult>;
} {
  const deliveries =
    createTeamInvitationDeliveryRepository(
      requireDatabase(environment),
    );
  const processor =
    createTeamInvitationDispatchProcessor(
      deliveries,
      provider,
    );

  return createTeamInvitationQueueConsumer(
    processor,
    provider,
  );
}
