# Source guardrail module contracts

`../verify-source-guardrails.mjs` remains the CLI and the public
`inspectSourceGuardrails(root?)` entry point. It owns the default project root,
security policy, dependency analysis and report shape.

- `file-discovery.mjs` owns the source extension and ignored-directory sets,
  filesystem traversal and canonical paths. Callers supply the traversal root.
  Internal directory aliases remain visible, cycles terminate, and traversal
  does not recurse outside the canonical root or into ignored directories.
  Missing paths and dangling links are tolerated; other I/O errors propagate.
- `package-targets.mjs` resolves package targets and compares wildcard targets
  with both declared and canonical paths. Repeated wildcards bind to the same
  value. Ambiguous directory wildcard and alias cases retain the existing
  conservative matching behavior; callers apply the security policy.
- `paths.mjs` provides pure path and specifier operations. Leading `#` package
  import names survive resource-suffix removal.

These modules do not select a repository, execute a CLI, change security
allowlists or authorize a dependency. File symlinks are returned for canonical
resolution by the inspector; discovery alone is not a containment guarantee.

Run the focused boundary and adversarial checks with:

```sh
node --test tests/source-guardrails-file-discovery.test.mjs tests/release-guardrails.test.mjs tests/source-guardrails-dormant-execution-escape.test.mjs
```
