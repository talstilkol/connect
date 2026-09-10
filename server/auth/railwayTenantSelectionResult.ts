import type {
  TenantSelectionDirectory,
  TenantSelectionOption,
} from "./tenantSelectionService.ts";

const selectionKeyPattern = /^tenant_selection_option_v1_[a-f0-9]{64}$/;
const roles = Object.freeze(["owner", "manager", "agent", "viewer"] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function parseOption(value: unknown): Readonly<TenantSelectionOption> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["displayName", "role", "selected", "selectionKey"]) ||
    typeof value.selectionKey !== "string" ||
    !selectionKeyPattern.test(value.selectionKey) ||
    typeof value.displayName !== "string" ||
    value.displayName.length === 0 ||
    value.displayName.length > 200 ||
    value.displayName !== value.displayName.trim() ||
    /[\u0000-\u001f\u007f]/.test(value.displayName) ||
    !roles.some((role) => role === value.role) ||
    typeof value.selected !== "boolean"
  ) {
    return null;
  }
  return Object.freeze({
    selectionKey: value.selectionKey,
    displayName: value.displayName,
    role: value.role as TenantSelectionOption["role"],
    selected: value.selected,
  });
}

export function parseRailwayTenantSelectionDirectory(
  value: unknown,
): Readonly<TenantSelectionDirectory> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["options", "selectionRequired", "version"]) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 0 ||
    typeof value.selectionRequired !== "boolean" ||
    !Array.isArray(value.options) ||
    value.options.length < 1 ||
    value.options.length > 100
  ) {
    return null;
  }
  const options = value.options.map(parseOption);
  if (
    options.some((option) => option === null) ||
    new Set(options.map((option) => option?.selectionKey)).size !== options.length
  ) {
    return null;
  }
  const parsedOptions = options as readonly Readonly<TenantSelectionOption>[];
  const selectedCount = parsedOptions.filter(({ selected }) => selected).length;
  if (
    (value.selectionRequired && selectedCount !== 0) ||
    (!value.selectionRequired && selectedCount !== 1)
  ) {
    return null;
  }
  return Object.freeze({
    version: Number(value.version),
    selectionRequired: value.selectionRequired,
    options: Object.freeze(parsedOptions),
  });
}

export function parseRailwayTenantSelectionSaveResult(
  value: unknown,
): Readonly<{
  version: number;
  unchanged: boolean;
  replayed: boolean;
}> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["replayed", "unchanged", "version"]) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) <= 0 ||
    typeof value.unchanged !== "boolean" ||
    typeof value.replayed !== "boolean" ||
    (value.replayed && !value.unchanged)
  ) {
    return null;
  }
  return Object.freeze({
    version: Number(value.version),
    unchanged: value.unchanged,
    replayed: value.replayed,
  });
}
