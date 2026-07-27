import {
  MessageTemplateTransitionError,
  type MessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  PersistedMessageTemplate,
} from "../../shared/domain/messageTemplate.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  MetaCredentialVaultError,
} from "../meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../meta/metaGraphTransport.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  deriveMessageTemplateSubmissionKey,
} from "./messageTemplateSubmissionKey.ts";
import {
  MetaMessageTemplateContractError,
  type MetaMessageTemplateSubmitter,
} from "./metaMessageTemplateAdapter.ts";

export type MessageTemplateSubmissionErrorCode =
  | "INVALID_INPUT"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_NOT_EDITABLE"
  | "META_NOT_CONNECTED"
  | "CREDENTIAL_UNAVAILABLE"
  | "STATE_CONFLICT"
  | "SUBMISSION_REJECTED"
  | "SUBMISSION_UNCERTAIN"
  | "SERVICE_UNAVAILABLE";

export class MessageTemplateSubmissionError extends Error {
  readonly code: MessageTemplateSubmissionErrorCode;

  constructor(
    code: MessageTemplateSubmissionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MessageTemplateSubmissionError";
    this.code = code;
  }
}

export interface MessageTemplateSubmissionService {
  submit(
    session: TenantSession,
    templateKey: unknown,
  ): Promise<PersistedMessageTemplate>;
}

export interface MessageTemplateSubmissionServiceDependencies {
  templates: MessageTemplateRepository;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  submitter: MetaMessageTemplateSubmitter;
}

function requireTemplateKey(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^template_v1_[0-9a-f]{64}$/.test(value)
  ) {
    throw new MessageTemplateSubmissionError(
      "INVALID_INPUT",
      "Message template key is invalid",
    );
  }

  return value;
}

function isKnownRejection(error: unknown): boolean {
  if (
    error instanceof MetaMessageTemplateContractError
  ) {
    return error.code === "INVALID_TEMPLATE_REQUEST";
  }

  if (!(error instanceof MetaGraphError)) {
    return false;
  }

  return (
    error.code === "INVALID_REQUEST" ||
    (error.code === "API_ERROR" &&
      error.httpStatus !== null &&
      error.httpStatus >= 400 &&
      error.httpStatus < 500)
  );
}

function submissionError(
  code: MessageTemplateSubmissionErrorCode,
): MessageTemplateSubmissionError {
  const messages: Record<
    MessageTemplateSubmissionErrorCode,
    string
  > = {
    INVALID_INPUT: "Message template input is invalid",
    TEMPLATE_NOT_FOUND: "Message template was not found",
    TEMPLATE_NOT_EDITABLE:
      "Message template is not an editable draft",
    META_NOT_CONNECTED:
      "A connected Meta account is required",
    CREDENTIAL_UNAVAILABLE:
      "Meta credential is unavailable",
    STATE_CONFLICT:
      "Message template state changed before submission",
    SUBMISSION_REJECTED:
      "Meta rejected the message template",
    SUBMISSION_UNCERTAIN:
      "Message template submission outcome is uncertain",
    SERVICE_UNAVAILABLE:
      "Message template service is unavailable",
  };

  return new MessageTemplateSubmissionError(
    code,
    messages[code],
  );
}

export function createMessageTemplateSubmissionService(
  dependencies: MessageTemplateSubmissionServiceDependencies,
): MessageTemplateSubmissionService {
  return {
    async submit(session, rawTemplateKey) {
      requireTenantPermission(session, "templates.write");
      const templateKey = requireTemplateKey(rawTemplateKey);
      let template: PersistedMessageTemplate | null;

      try {
        template = await dependencies.templates.findByKey(
          session.tenantId,
          templateKey,
        );
      } catch {
        throw submissionError("SERVICE_UNAVAILABLE");
      }

      if (!template) {
        throw submissionError("TEMPLATE_NOT_FOUND");
      }

      if (template.status === "submitting") {
        throw submissionError("SUBMISSION_UNCERTAIN");
      }

      if (template.status !== "draft") {
        throw submissionError("TEMPLATE_NOT_EDITABLE");
      }

      let connection;

      try {
        connection =
          await dependencies.metaConnections
            .findConnectionByTenantId(session.tenantId);
      } catch {
        throw submissionError("SERVICE_UNAVAILABLE");
      }

      if (
        !connection ||
        connection.status !== "connected" ||
        !/^[1-9][0-9]{0,63}$/.test(connection.wabaId)
      ) {
        throw submissionError("META_NOT_CONNECTED");
      }

      try {
        return await dependencies.credentialVault
          .withAccessToken(
            session.tenantId,
            async (accessToken) => {
              let submissionKey: string;

              try {
                submissionKey =
                  await deriveMessageTemplateSubmissionKey(
                    template,
                  );
              } catch {
                throw submissionError("SERVICE_UNAVAILABLE");
              }

              let claimedTemplate: PersistedMessageTemplate;

              try {
                claimedTemplate =
                  await dependencies.templates
                    .claimSubmission(
                      session.tenantId,
                      templateKey,
                      template.version,
                      submissionKey,
                    );
              } catch (error) {
                if (
                  error instanceof
                  MessageTemplateTransitionError
                ) {
                  throw submissionError("STATE_CONFLICT");
                }

                throw submissionError(
                  "SERVICE_UNAVAILABLE",
                );
              }

              let submitted;

              try {
                submitted =
                  await dependencies.submitter.submit({
                    wabaId: connection.wabaId,
                    accessToken,
                    template: claimedTemplate,
                  });
              } catch (error) {
                if (!isKnownRejection(error)) {
                  throw submissionError(
                    "SUBMISSION_UNCERTAIN",
                  );
                }

                try {
                  await dependencies.templates
                    .releaseSubmission(
                      session.tenantId,
                      templateKey,
                      submissionKey,
                      error instanceof
                        MetaMessageTemplateContractError
                        ? "META_TEMPLATE_REQUEST_INVALID"
                        : "META_TEMPLATE_REJECTED",
                    );
                } catch {
                  throw submissionError(
                    "SUBMISSION_UNCERTAIN",
                  );
                }

                throw submissionError(
                  "SUBMISSION_REJECTED",
                );
              }

              try {
                return await dependencies.templates
                  .completeSubmission(
                    session.tenantId,
                    templateKey,
                    submissionKey,
                    submitted.metaTemplateId,
                  );
              } catch {
                throw submissionError(
                  "SUBMISSION_UNCERTAIN",
                );
              }
            },
          );
      } catch (error) {
        if (error instanceof MessageTemplateSubmissionError) {
          throw error;
        }

        if (error instanceof MetaCredentialVaultError) {
          throw submissionError("CREDENTIAL_UNAVAILABLE");
        }

        throw submissionError("SERVICE_UNAVAILABLE");
      }
    },
  };
}
