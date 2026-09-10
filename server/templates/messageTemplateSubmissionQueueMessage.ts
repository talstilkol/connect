export interface MessageTemplateSubmissionQueueMessage {
  readonly version: 1;
  readonly tenantId: number;
  readonly submissionKey: string;
}

const submissionKeyPattern = /^template_submission_v1_[0-9a-f]{64}$/;

function requireTenantId(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("Message template submission tenant is invalid");
  }

  return Number(value);
}

function requireSubmissionKey(value: unknown): string {
  if (typeof value !== "string" || !submissionKeyPattern.test(value)) {
    throw new Error("Message template submission key is invalid");
  }

  return value;
}

export function createMessageTemplateSubmissionQueueMessage(
  tenantIdInput: unknown,
  submissionKeyInput: unknown,
): Readonly<MessageTemplateSubmissionQueueMessage> {
  return Object.freeze({
    version: 1 as const,
    tenantId: requireTenantId(tenantIdInput),
    submissionKey: requireSubmissionKey(submissionKeyInput),
  });
}

export function parseMessageTemplateSubmissionQueueMessage(
  value: unknown,
): Readonly<MessageTemplateSubmissionQueueMessage> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  let descriptors: PropertyDescriptorMap;

  try {
    if (Array.isArray(value)) {
      return null;
    }

    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    return null;
  }

  const expectedKeys = [
    "version",
    "tenantId",
    "submissionKey",
  ] as const;
  const actualKeys = Reflect.ownKeys(descriptors);

  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) =>
      Object.hasOwn(descriptors, key),
    )
  ) {
    return null;
  }

  const values = Object.create(null) as Record<
    (typeof expectedKeys)[number],
    unknown
  >;

  for (const key of expectedKeys) {
    const descriptor = descriptors[key];

    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor)
    ) {
      return null;
    }

    values[key] = descriptor.value;
  }

  if (values.version !== 1) {
    return null;
  }

  try {
    return createMessageTemplateSubmissionQueueMessage(
      values.tenantId,
      values.submissionKey,
    );
  } catch {
    return null;
  }
}
