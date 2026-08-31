export type TemplateVariableInspection = {
  numbers: number[];
  error:
    | { code: "invalid-syntax" }
    | { code: "missing-sequence"; expected: number }
    | null;
};

export function inspectTemplateVariables(
  body: string,
): TemplateVariableInspection {
  const matches = [...body.matchAll(/{{(\d+)}}/g)];
  const withoutValidVariables = body.replace(/{{\d+}}/g, "");

  if (
    withoutValidVariables.includes("{{") ||
    withoutValidVariables.includes("}}")
  ) {
    return {
      numbers: uniqueSortedVariableNumbers(matches),
      error: { code: "invalid-syntax" },
    };
  }

  const numbers = uniqueSortedVariableNumbers(matches);

  for (let index = 0; index < numbers.length; index += 1) {
    const expected = index + 1;

    if (numbers[index] !== expected) {
      return {
        numbers,
        error: { code: "missing-sequence", expected },
      };
    }
  }

  return { numbers, error: null };
}

export function applyTemplateVariableValues(
  body: string,
  values: Readonly<Record<number, string>>,
): string {
  return body.replace(/{{(\d+)}}/g, (token, variableNumber: string) => {
    const value = values[Number(variableNumber)]?.trim();
    return value ? value : token;
  });
}

export function containsTemplateVariableSyntax(value: string): boolean {
  return value.includes("{{") || value.includes("}}");
}

function uniqueSortedVariableNumbers(
  matches: readonly RegExpExecArray[],
): number[] {
  return [
    ...new Set(Array.from(matches, (match) => Number(match[1]))),
  ].sort((first, second) => first - second);
}
