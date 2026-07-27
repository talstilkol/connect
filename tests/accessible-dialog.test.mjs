import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveFocusTrapTarget,
} from "../features/workspace/useAccessibleDialog.ts";

test("wraps keyboard focus at both dialog boundaries", () => {
  assert.equal(
    resolveFocusTrapTarget(0, 3, true),
    2,
  );
  assert.equal(
    resolveFocusTrapTarget(2, 3, false),
    0,
  );
  assert.equal(
    resolveFocusTrapTarget(-1, 3, false),
    0,
  );
});

test("leaves focus alone inside the dialog and handles an empty dialog", () => {
  assert.equal(
    resolveFocusTrapTarget(1, 3, false),
    null,
  );
  assert.equal(
    resolveFocusTrapTarget(1, 3, true),
    null,
  );
  assert.equal(
    resolveFocusTrapTarget(-1, 0, false),
    null,
  );
});
