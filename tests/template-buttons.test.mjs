import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDynamicUrlExample,
  isDynamicHttpsUrlCandidate,
  isHttpsUrlCandidate,
  isPhoneNumberCandidate,
} from "../shared/validation/templateButtons.ts";

test("accepts only a syntactically valid HTTPS URL", () => {
  assert.equal(isHttpsUrlCandidate(""), false);
  assert.equal(isHttpsUrlCandidate("https://"), false);
  assert.equal(isHttpsUrlCandidate("http://a"), false);
  assert.equal(isHttpsUrlCandidate("https://a"), true);
});

test("accepts digits with an optional leading plus for a phone candidate", () => {
  assert.equal(isPhoneNumberCandidate(""), false);
  assert.equal(isPhoneNumberCandidate("1"), true);
  assert.equal(isPhoneNumberCandidate("+1"), true);
  assert.equal(isPhoneNumberCandidate("1 1"), false);
});

test("accepts one supported variable in a dynamic HTTPS URL", () => {
  assert.equal(isDynamicHttpsUrlCandidate("https://a/{{1}}"), true);
  assert.equal(isDynamicHttpsUrlCandidate("https://a/{{2}}"), false);
  assert.equal(
    isDynamicHttpsUrlCandidate("https://a/{{1}}/{{1}}"),
    false,
  );
  assert.equal(isDynamicHttpsUrlCandidate("http://a/{{1}}"), false);
});

test("applies the URL example only to the supported URL variable", () => {
  assert.equal(applyDynamicUrlExample("https://a/{{1}}", "1"), "https://a/1");
});
