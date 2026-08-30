import type {
  MetaGraphTransport,
} from "../meta/metaGraphTransport.ts";
import type {
  SensitiveMetaAccessToken,
} from "../meta/metaPorts.ts";
import {
  isMetaMessageTemplateProviderStatus,
  type MetaMessageTemplateProviderStatus,
} from "./metaMessageTemplateStatus.ts";
import {
  observeProviderRequest,
  type ProviderRequestTelemetryClock,
  type ProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";

const PAGE_SIZE = 100;
const MAXIMUM_PAGES = 20;
const MAXIMUM_TEMPLATES = PAGE_SIZE * MAXIMUM_PAGES;

export type MetaMessageTemplateListErrorCode =
  | "INVALID_WABA_ID"
  | "INVALID_RESPONSE"
  | "PAGINATION_ERROR";

export class MetaMessageTemplateListError extends Error {
  readonly code: MetaMessageTemplateListErrorCode;

  constructor(
    code: MetaMessageTemplateListErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaMessageTemplateListError";
    this.code = code;
  }
}

export interface MetaMessageTemplateSnapshot {
  metaTemplateId: string;
  name: string;
  language: string;
  category: string;
  providerStatus: MetaMessageTemplateProviderStatus;
}

export interface MetaMessageTemplateLister {
  list(input: {
    wabaId: string;
    accessToken: SensitiveMetaAccessToken;
  }): Promise<readonly MetaMessageTemplateSnapshot[]>;
}

export interface MetaMessageTemplateListAdapterTelemetry {
  readonly scope: ProviderRequestTelemetryScope;
  readonly clock: ProviderRequestTelemetryClock;
}

interface MetaMessageTemplatePage {
  templates: readonly MetaMessageTemplateSnapshot[];
  nextCursor: string | null;
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

function invalidResponse(message: string): never {
  throw new MetaMessageTemplateListError(
    "INVALID_RESPONSE",
    message,
  );
}

function requireWabaId(value: string): string {
  if (!/^[1-9][0-9]{0,63}$/.test(value)) {
    throw new MetaMessageTemplateListError(
      "INVALID_WABA_ID",
      "Meta WABA ID is invalid",
    );
  }

  return value;
}

function readMetaTemplateId(value: unknown): string {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  ) {
    return String(value);
  }

  if (
    typeof value === "string" &&
    /^[1-9][0-9]{0,254}$/.test(value)
  ) {
    return value;
  }

  return invalidResponse(
    "Meta message template ID is invalid",
  );
}

function readBoundedString(
  value: unknown,
  pattern: RegExp,
  message: string,
): string {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !pattern.test(value)
  ) {
    return invalidResponse(message);
  }

  return value;
}

function readTemplate(
  value: unknown,
): MetaMessageTemplateSnapshot {
  if (!isRecord(value)) {
    return invalidResponse(
      "Meta message template entry is invalid",
    );
  }

  if (!isMetaMessageTemplateProviderStatus(value.status)) {
    return invalidResponse(
      "Meta message template status is unsupported",
    );
  }

  return {
    metaTemplateId: readMetaTemplateId(value.id),
    name: readBoundedString(
      value.name,
      /^[a-z0-9_]{1,255}$/,
      "Meta message template name is invalid",
    ),
    language: readBoundedString(
      value.language,
      /^[a-z]{2,3}(?:_[A-Z]{2})?$/,
      "Meta message template language is invalid",
    ),
    category: readBoundedString(
      value.category,
      /^[A-Z][A-Z0-9_]{0,99}$/,
      "Meta message template category is invalid",
    ),
    providerStatus: value.status,
  };
}

function readPage(value: unknown): MetaMessageTemplatePage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    return invalidResponse(
      "Meta message template list response is invalid",
    );
  }

  if (value.data.length > PAGE_SIZE) {
    return invalidResponse(
      "Meta message template page is too large",
    );
  }

  const templates = value.data.map(readTemplate);

  if (value.paging === undefined) {
    return { templates, nextCursor: null };
  }

  if (!isRecord(value.paging)) {
    return invalidResponse(
      "Meta message template pagination is invalid",
    );
  }

  if (value.paging.next === undefined) {
    return { templates, nextCursor: null };
  }

  if (
    typeof value.paging.next !== "string" ||
    value.paging.next.trim().length === 0 ||
    value.paging.next.length > 4096 ||
    !isRecord(value.paging.cursors)
  ) {
    return invalidResponse(
      "Meta message template pagination is invalid",
    );
  }

  const afterCursor = value.paging.cursors.after;

  if (
    typeof afterCursor !== "string" ||
    afterCursor.trim().length === 0 ||
    afterCursor.length > 4096
  ) {
    return invalidResponse(
      "Meta message template pagination cursor is invalid",
    );
  }

  return {
    templates,
    nextCursor: afterCursor,
  };
}

export function createMetaMessageTemplateListAdapter(
  transport: MetaGraphTransport,
  telemetry?: Readonly<MetaMessageTemplateListAdapterTelemetry>,
): MetaMessageTemplateLister {
  if (
    telemetry !== undefined &&
    (
      typeof telemetry.scope?.record !== "function" ||
      typeof telemetry.clock?.now !== "function"
    )
  ) {
    throw new MetaMessageTemplateListError(
      "INVALID_RESPONSE",
      "Meta message template telemetry is invalid",
    );
  }

  return {
    async list(input) {
      const wabaId = requireWabaId(input.wabaId);
      const templates: MetaMessageTemplateSnapshot[] = [];
      const visitedCursors = new Set<string>();
      const visitedTemplateIds = new Set<string>();
      let afterCursor: string | null = null;

      for (
        let pageNumber = 1;
        pageNumber <= MAXIMUM_PAGES;
        pageNumber += 1
      ) {
        const query: Record<string, string> = {
          fields: "id,name,language,status,category",
          limit: String(PAGE_SIZE),
        };

        if (afterCursor !== null) {
          query.after = afterCursor;
        }

        const request = () => transport.requestJson<unknown>({
            method: "GET",
            pathSegments: [wabaId, "message_templates"],
            accessToken: input.accessToken,
            query,
          });
        const page = readPage(
          telemetry === undefined
            ? await request()
            : await observeProviderRequest(
                telemetry.scope,
                telemetry.clock,
                Object.freeze({
                  provider: "meta",
                  operation: "message-template.list",
                }),
                request,
              ),
        );

        for (const template of page.templates) {
          if (
            templates.length === MAXIMUM_TEMPLATES ||
            visitedTemplateIds.has(template.metaTemplateId)
          ) {
            throw new MetaMessageTemplateListError(
              "PAGINATION_ERROR",
              "Meta message template pagination is inconsistent",
            );
          }

          visitedTemplateIds.add(template.metaTemplateId);
          templates.push(template);
        }

        if (page.nextCursor === null) {
          return templates;
        }

        if (
          visitedCursors.has(page.nextCursor) ||
          pageNumber === MAXIMUM_PAGES
        ) {
          throw new MetaMessageTemplateListError(
            "PAGINATION_ERROR",
            "Meta message template pagination could not be completed",
          );
        }

        visitedCursors.add(page.nextCursor);
        afterCursor = page.nextCursor;
      }

      throw new MetaMessageTemplateListError(
        "PAGINATION_ERROR",
        "Meta message template pagination could not be completed",
      );
    },
  };
}
