export type D1Value = ArrayBuffer | number | string | null;

export interface D1Result<TRow = Record<string, unknown>> {
  success: boolean;
  results?: readonly TRow[];
  error?: string;
  meta?: {
    changes?: number;
  };
}

export interface D1PreparedStatement {
  bind(...values: readonly D1Value[]): D1PreparedStatement;
  all<TRow = Record<string, unknown>>(): Promise<D1Result<TRow>>;
  first<TRow = Record<string, unknown>>(): Promise<TRow | null>;
  run<TRow = Record<string, unknown>>(): Promise<D1Result<TRow>>;
}

export interface D1DatabaseBinding {
  prepare(sql: string): D1PreparedStatement;
  batch<TRow = Record<string, unknown>>(
    statements: readonly D1PreparedStatement[],
  ): Promise<readonly D1Result<TRow>[]>;
}

export interface DatabaseEnvironment {
  DB?: D1DatabaseBinding;
}

export function requireDatabase(
  environment: DatabaseEnvironment,
): D1DatabaseBinding {
  if (!environment.DB) {
    throw new Error("Missing required D1 binding: DB");
  }

  return environment.DB;
}
