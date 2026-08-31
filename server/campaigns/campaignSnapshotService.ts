import type {
  BusinessProfileRepository,
} from "../../db/businessProfileRepository.ts";
import type {
  CampaignAudienceRepository,
} from "../../db/campaignAudienceRepository.ts";
import type {
  CampaignRepository,
  SaveCampaignRecipientSnapshotInput,
} from "../../db/campaignRepository.ts";
import type {
  MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  CampaignAudienceSource,
} from "../../shared/domain/campaignAudience.ts";
import type {
  CampaignRecipientIdentity,
  CampaignTemplateSnapshot,
  PersistedCampaign,
  ValidatedCampaignDefinition,
} from "../../shared/domain/campaign.ts";
import {
  inspectCampaignRecipientEligibility,
} from "../../shared/validation/campaignRecipientEligibility.ts";
import {
  personalizeCampaignContact,
  validateCampaignAudienceSource,
  validateCampaignPersonalizationMapping,
} from "../../shared/validation/campaignAudience.ts";
import {
  validateCampaignDefinition,
} from "../../shared/validation/campaignDefinition.ts";
import {
  inspectTemplateVariables,
} from "../../shared/validation/templateVariables.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveCampaignAudienceKey,
  deriveCampaignDeliveryKey,
  deriveCampaignKey,
  deriveCampaignPersonalizationKey,
} from "./campaignKey.ts";

const MAXIMUM_RECIPIENTS = 100_000;
const CAMPAIGN_LIST_LIMIT = 100;
const TEMPLATE_KEY_PATTERN =
  /^template_v1_[0-9a-f]{64}$/;

export type CampaignSnapshotErrorCode =
  | "INVALID_INPUT"
  | "PROFILE_REQUIRED"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_NOT_APPROVED"
  | "INVALID_AUDIENCE"
  | "PERSISTENCE_FAILED";

export class CampaignSnapshotError extends Error {
  readonly code: CampaignSnapshotErrorCode;

  constructor(code: CampaignSnapshotErrorCode) {
    super("Campaign snapshot operation failed");
    this.name = "CampaignSnapshotError";
    this.code = code;
  }
}

export interface ParsedCampaignSnapshotRequest {
  name: string;
  deliveryMode: ValidatedCampaignDefinition["deliveryMode"];
  scheduledAt: string | null;
  templateKey: string;
  audienceSource: CampaignAudienceSource;
  personalizationMapping: unknown;
}

export interface CampaignSnapshotService {
  list(
    session: TenantSession,
  ): Promise<readonly PersistedCampaign[]>;
  save(
    session: TenantSession,
    input: unknown,
  ): Promise<PersistedCampaign>;
}

export interface CampaignSnapshotServiceDependencies {
  audiences: CampaignAudienceRepository;
  campaigns: CampaignRepository;
  templates: Pick<MessageTemplateRepository, "findByKey">;
  businessProfiles: Pick<
    BusinessProfileRepository,
    "findByTenantId"
  >;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function parseCampaignSnapshotRequest(
  input: unknown,
): ParsedCampaignSnapshotRequest | null {
  if (
    !isRecord(input) ||
    Object.keys(input).sort().join(",") !==
      [
        "audienceSource",
        "deliveryMode",
        "name",
        "personalizationMapping",
        "scheduledAt",
        "templateKey",
      ].join(",") ||
    typeof input.name !== "string" ||
    input.name.trim().length === 0 ||
    input.name.trim().length > 160 ||
    (input.deliveryMode !== "immediate" &&
      input.deliveryMode !== "scheduled") ||
    (input.scheduledAt !== null &&
      typeof input.scheduledAt !== "string") ||
    typeof input.templateKey !== "string" ||
    !TEMPLATE_KEY_PATTERN.test(input.templateKey) ||
    !validateCampaignAudienceSource(
      input.audienceSource,
    ).success
  ) {
    return null;
  }

  if (
    (input.deliveryMode === "immediate" &&
      input.scheduledAt !== null) ||
    (input.deliveryMode === "scheduled" &&
      (typeof input.scheduledAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          input.scheduledAt,
        ) ||
        !Number.isFinite(
          Date.parse(input.scheduledAt),
        ) ||
        new Date(
          Date.parse(input.scheduledAt),
        ).toISOString() !== input.scheduledAt))
  ) {
    return null;
  }

  const audienceSource =
    validateCampaignAudienceSource(
      input.audienceSource,
    );

  if (!audienceSource.success) {
    return null;
  }

  return {
    name: input.name,
    deliveryMode: input.deliveryMode,
    scheduledAt: input.scheduledAt,
    templateKey: input.templateKey,
    audienceSource: audienceSource.value,
    personalizationMapping:
      input.personalizationMapping,
  };
}

function toTemplateSnapshot(
  template: Awaited<
    ReturnType<MessageTemplateRepository["findByKey"]>
  >,
): CampaignTemplateSnapshot | null {
  if (
    !template ||
    template.status !== "approved" ||
    template.metaTemplateId === null
  ) {
    return null;
  }

  return {
    templateKey: template.templateKey,
    metaTemplateId: template.metaTemplateId,
    name: template.name,
    category: template.category,
    language: template.language,
    version: template.version,
    header: template.header,
    body: template.body,
    footer: template.footer,
    variableExamples: {
      ...template.variableExamples,
    },
    buttonMode: template.buttonMode,
    quickReplies: [...template.quickReplies],
    urlButton: { ...template.urlButton },
    phoneButton: { ...template.phoneButton },
  };
}

function expectedPersonalizationKeys(
  template: CampaignTemplateSnapshot,
): readonly string[] {
  const keys = inspectTemplateVariables(
    template.body,
  ).numbers.map(
    (variableNumber) => `body:${variableNumber}`,
  );
  const requiresDynamicUrl =
    template.buttonMode === "call_to_action" &&
    template.urlButton.enabled &&
    template.urlButton.mode === "dynamic";

  if (requiresDynamicUrl) {
    keys.push("url:1");
  }

  return keys.sort(
    (first, second) => first.localeCompare(second),
  );
}

function snapshotError(
  code: CampaignSnapshotErrorCode,
): CampaignSnapshotError {
  return new CampaignSnapshotError(code);
}

export function createCampaignSnapshotService(
  dependencies: CampaignSnapshotServiceDependencies,
): CampaignSnapshotService {
  return {
    async list(session) {
      requireTenantPermission(
        session,
        "campaigns.read",
      );

      try {
        return await dependencies.campaigns
          .listByTenant(
            session.tenantId,
            CAMPAIGN_LIST_LIMIT,
          );
      } catch {
        throw snapshotError("PERSISTENCE_FAILED");
      }
    },

    async save(session, input) {
      requireTenantPermission(
        session,
        "campaigns.write",
      );

      const request = parseCampaignSnapshotRequest(input);

      if (!request) {
        throw snapshotError("INVALID_INPUT");
      }

      let profile;
      let template;

      try {
        [profile, template] = await Promise.all([
          dependencies.businessProfiles.findByTenantId(
            session.tenantId,
          ),
          dependencies.templates.findByKey(
            session.tenantId,
            request.templateKey,
          ),
        ]);
      } catch {
        throw snapshotError("PERSISTENCE_FAILED");
      }

      if (!profile) {
        throw snapshotError("PROFILE_REQUIRED");
      }

      if (!template) {
        throw snapshotError("TEMPLATE_NOT_FOUND");
      }

      const templateSnapshot =
        toTemplateSnapshot(template);

      if (!templateSnapshot) {
        throw snapshotError(
          "TEMPLATE_NOT_APPROVED",
        );
      }

      const requiredPersonalizationKeys =
        expectedPersonalizationKeys(templateSnapshot);
      const personalizationMapping =
        validateCampaignPersonalizationMapping(
          request.personalizationMapping,
          requiredPersonalizationKeys,
        );

      if (!personalizationMapping.success) {
        throw snapshotError("INVALID_AUDIENCE");
      }

      let sourceContacts;

      try {
        sourceContacts =
          await dependencies.audiences
            .listEligibleBySource(
              session.tenantId,
              request.audienceSource,
              MAXIMUM_RECIPIENTS + 1,
            );
      } catch {
        throw snapshotError("PERSISTENCE_FAILED");
      }

      if (
        sourceContacts.length === 0 ||
        sourceContacts.length > MAXIMUM_RECIPIENTS
      ) {
        throw snapshotError("INVALID_AUDIENCE");
      }

      const recipients: Array<
        CampaignRecipientIdentity & {
          personalization: Readonly<
            Record<string, string>
          >;
        }
      > = [];

      try {
        for (const source of sourceContacts) {
          const personalization =
            personalizeCampaignContact(
              source,
              personalizationMapping.value,
            );

          if (!personalization.success) {
            throw snapshotError("INVALID_AUDIENCE");
          }

          const personalizationIdentity =
            await deriveCampaignPersonalizationKey(
              session.tenantId,
              templateSnapshot.templateKey,
              personalization.value,
            );
          const recipient = {
            contactId: source.contactId,
            contactVersion: source.version,
            phoneNumber: source.phoneNumber,
            mailingStatus: source.mailingStatus,
            consentStatus: source.consentStatus,
            personalization:
              personalizationIdentity.personalization,
            personalizationKey:
              personalizationIdentity.personalizationKey,
          };
          const eligibility =
            inspectCampaignRecipientEligibility(
              recipient,
            );

          if (!eligibility.eligible) {
            throw snapshotError("INVALID_AUDIENCE");
          }

          recipients.push(recipient);
        }

        const audienceSnapshotKey =
          await deriveCampaignAudienceKey(
            session.tenantId,
            recipients,
          );
        const campaignDefinition =
          validateCampaignDefinition({
            name: request.name,
            deliveryMode: request.deliveryMode,
            scheduledAt: request.scheduledAt,
            timezone: profile.timezone,
            template: templateSnapshot,
            audienceSnapshotKey,
            recipientCount: recipients.length,
          });

        if (!campaignDefinition.success) {
          throw snapshotError("INVALID_INPUT");
        }

        const campaignKey = await deriveCampaignKey(
          session.tenantId,
          campaignDefinition.value,
        );
        const recipientSnapshots:
          SaveCampaignRecipientSnapshotInput[] =
          await Promise.all(
            recipients
              .sort(
                (first, second) =>
                  first.contactId - second.contactId,
              )
              .map(async (recipient) => ({
                contactId: recipient.contactId,
                contactVersion:
                  recipient.contactVersion,
                phoneNumber: recipient.phoneNumber,
                personalization:
                  recipient.personalization,
                personalizationKey:
                  recipient.personalizationKey,
                deliveryKey:
                  await deriveCampaignDeliveryKey(
                    session.tenantId,
                    campaignKey,
                    recipient,
                  ),
              })),
          );

        try {
          return await dependencies.campaigns
            .saveSnapshot({
              tenantId: session.tenantId,
              campaignKey,
              ...campaignDefinition.value,
              recipients: recipientSnapshots,
            });
        } catch {
          throw snapshotError("PERSISTENCE_FAILED");
        }
      } catch (error) {
        if (error instanceof CampaignSnapshotError) {
          throw error;
        }

        throw snapshotError("INVALID_AUDIENCE");
      }
    },
  };
}
