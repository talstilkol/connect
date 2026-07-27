import type {
  ValidatedMessageTemplateDraft,
} from "../domain/messageTemplate.ts";
import {
  persistedTemplateCategories,
  persistedTemplateLanguages,
} from "../domain/messageTemplate.ts";
import {
  containsTemplateVariableSyntax,
  inspectTemplateVariables,
} from "./templateVariables.ts";
import {
  isDynamicHttpsUrlCandidate,
  isHttpsUrlCandidate,
  isPhoneNumberCandidate,
} from "./templateButtons.ts";

export type MessageTemplateDraftIssue =
  | "invalid-input"
  | "invalid-name"
  | "unsupported-category"
  | "invalid-language"
  | "invalid-header"
  | "invalid-body"
  | "invalid-variable-examples"
  | "invalid-footer"
  | "invalid-buttons";

export type MessageTemplateDraftValidation =
  | {
      success: true;
      value: ValidatedMessageTemplateDraft;
    }
  | {
      success: false;
      issues: readonly MessageTemplateDraftIssue[];
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function trimmedText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length <= maximumLength ? trimmed : null;
}

function isCategory(
  value: unknown,
): value is ValidatedMessageTemplateDraft["category"] {
  return persistedTemplateCategories.some(
    (category) => category === value,
  );
}

function isLanguage(
  value: unknown,
): value is ValidatedMessageTemplateDraft["language"] {
  return persistedTemplateLanguages.some(
    (language) => language === value,
  );
}

function parseVariableExamples(
  value: unknown,
  variableNumbers: readonly number[],
): Readonly<Record<number, string>> | null {
  if (!isRecord(value)) {
    return null;
  }

  const expectedKeys = variableNumbers.map(String);
  const actualKeys = Object.keys(value).sort(
    (first, second) => Number(first) - Number(second),
  );

  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some(
      (key, index) => key !== expectedKeys[index],
    )
  ) {
    return null;
  }

  const result: Record<number, string> = {};

  for (const variableNumber of variableNumbers) {
    const example = trimmedText(
      value[String(variableNumber)],
      1_000,
    );

    if (example === null || example.length === 0) {
      return null;
    }

    result[variableNumber] = example;
  }

  return result;
}

function emptyUrlButton() {
  return {
    enabled: false,
    mode: "static" as const,
    text: "",
    value: "",
    example: "",
  };
}

function emptyPhoneButton() {
  return {
    enabled: false,
    text: "",
    value: "",
  };
}

function parseQuickReplies(
  input: Record<string, unknown>,
): Pick<
  ValidatedMessageTemplateDraft,
  "buttonMode" | "quickReplies" | "urlButton" | "phoneButton"
> | null {
  if (
    !Array.isArray(input.quickReplies) ||
    input.quickReplies.length < 1 ||
    input.quickReplies.length > 2
  ) {
    return null;
  }

  const quickReplies: string[] = [];

  for (const value of input.quickReplies) {
    const text = trimmedText(value, 100);

    if (
      text === null ||
      text.length === 0 ||
      containsTemplateVariableSyntax(text)
    ) {
      return null;
    }

    quickReplies.push(text);
  }

  return {
    buttonMode: "quick_reply",
    quickReplies,
    urlButton: emptyUrlButton(),
    phoneButton: emptyPhoneButton(),
  };
}

function parseUrlButton(
  value: unknown,
): ValidatedMessageTemplateDraft["urlButton"] | null {
  if (!isRecord(value) || typeof value.enabled !== "boolean") {
    return null;
  }

  if (!value.enabled) {
    return emptyUrlButton();
  }

  if (
    value.mode !== "static" &&
    value.mode !== "dynamic"
  ) {
    return null;
  }

  const text = trimmedText(value.text, 100);
  const url = trimmedText(value.value, 4_000);
  const example = trimmedText(value.example, 1_000);

  if (
    text === null ||
    text.length === 0 ||
    containsTemplateVariableSyntax(text) ||
    url === null ||
    url.length === 0 ||
    example === null
  ) {
    return null;
  }

  if (
    value.mode === "static" &&
    (!isHttpsUrlCandidate(url) ||
      containsTemplateVariableSyntax(url))
  ) {
    return null;
  }

  if (
    value.mode === "dynamic" &&
    (!isDynamicHttpsUrlCandidate(url) ||
      example.length === 0 ||
      containsTemplateVariableSyntax(example))
  ) {
    return null;
  }

  return {
    enabled: true,
    mode: value.mode,
    text,
    value: url,
    example: value.mode === "dynamic" ? example : "",
  };
}

function parsePhoneButton(
  value: unknown,
): ValidatedMessageTemplateDraft["phoneButton"] | null {
  if (!isRecord(value) || typeof value.enabled !== "boolean") {
    return null;
  }

  if (!value.enabled) {
    return emptyPhoneButton();
  }

  const text = trimmedText(value.text, 100);
  const phoneNumber = trimmedText(value.value, 32);

  if (
    text === null ||
    text.length === 0 ||
    containsTemplateVariableSyntax(text) ||
    phoneNumber === null ||
    !isPhoneNumberCandidate(phoneNumber) ||
    containsTemplateVariableSyntax(phoneNumber)
  ) {
    return null;
  }

  return {
    enabled: true,
    text,
    value: phoneNumber,
  };
}

function parseCallToAction(
  input: Record<string, unknown>,
): Pick<
  ValidatedMessageTemplateDraft,
  "buttonMode" | "quickReplies" | "urlButton" | "phoneButton"
> | null {
  const urlButton = parseUrlButton(input.urlButton);
  const phoneButton = parsePhoneButton(input.phoneButton);

  if (
    urlButton === null ||
    phoneButton === null ||
    (!urlButton.enabled && !phoneButton.enabled)
  ) {
    return null;
  }

  return {
    buttonMode: "call_to_action",
    quickReplies: [],
    urlButton,
    phoneButton,
  };
}

function parseButtons(
  input: Record<string, unknown>,
): Pick<
  ValidatedMessageTemplateDraft,
  "buttonMode" | "quickReplies" | "urlButton" | "phoneButton"
> | null {
  if (input.buttonMode === "none") {
    return {
      buttonMode: "none",
      quickReplies: [],
      urlButton: emptyUrlButton(),
      phoneButton: emptyPhoneButton(),
    };
  }

  if (input.buttonMode === "quick_reply") {
    return parseQuickReplies(input);
  }

  if (input.buttonMode === "call_to_action") {
    return parseCallToAction(input);
  }

  return null;
}

export function validateMessageTemplateDraft(
  input: unknown,
): MessageTemplateDraftValidation {
  if (!isRecord(input)) {
    return {
      success: false,
      issues: ["invalid-input"],
    };
  }

  const issues: MessageTemplateDraftIssue[] = [];
  const name = trimmedText(input.name, 255);
  const header = trimmedText(input.header, 1_000);
  const body = trimmedText(input.body, 10_000);
  const footer = trimmedText(input.footer, 1_000);

  if (
    name === null ||
    !/^[a-z0-9_]+$/.test(name)
  ) {
    issues.push("invalid-name");
  }

  if (!isCategory(input.category)) {
    issues.push("unsupported-category");
  }

  if (!isLanguage(input.language)) {
    issues.push("invalid-language");
  }

  if (
    header === null ||
    containsTemplateVariableSyntax(header)
  ) {
    issues.push("invalid-header");
  }

  const variableInspection =
    body === null
      ? { numbers: [], error: "invalid" }
      : inspectTemplateVariables(body);

  if (
    body === null ||
    body.length === 0 ||
    variableInspection.error !== null
  ) {
    issues.push("invalid-body");
  }

  const variableExamples = parseVariableExamples(
    input.variableExamples,
    variableInspection.numbers,
  );

  if (variableExamples === null) {
    issues.push("invalid-variable-examples");
  }

  if (
    footer === null ||
    containsTemplateVariableSyntax(footer)
  ) {
    issues.push("invalid-footer");
  }

  const buttons = parseButtons(input);

  if (buttons === null) {
    issues.push("invalid-buttons");
  }

  if (
    issues.length > 0 ||
    name === null ||
    !isCategory(input.category) ||
    !isLanguage(input.language) ||
    header === null ||
    body === null ||
    footer === null ||
    variableExamples === null ||
    buttons === null
  ) {
    return {
      success: false,
      issues,
    };
  }

  return {
    success: true,
    value: {
      name,
      category: input.category,
      language: input.language,
      header,
      body,
      footer,
      variableExamples,
      ...buttons,
    },
  };
}
