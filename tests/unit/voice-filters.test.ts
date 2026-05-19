import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirror of the gender match logic in voice-picker.tsx so we can guard against
 * the regression where "female" matched the "male" filter via substring search.
 */
function matchesGender(
  voiceGender: unknown,
  genderFilter: "all" | "male" | "female",
): boolean {
  if (genderFilter === "all") return true;
  if (typeof voiceGender !== "string") return false;
  return voiceGender
    .toLowerCase()
    .split(/[\s/_,\-()]+/)
    .filter(Boolean)
    .includes(genderFilter);
}

test("male filter does not match female voices", () => {
  assert.equal(matchesGender("Female", "male"), false);
  assert.equal(matchesGender("FEMALE", "male"), false);
  assert.equal(matchesGender("Adult Female", "male"), false);
  assert.equal(matchesGender("Non-binary/female", "male"), false);
});

test("male filter matches male voices including compound labels", () => {
  assert.equal(matchesGender("Male", "male"), true);
  assert.equal(matchesGender("Adult male", "male"), true);
  assert.equal(matchesGender("male - deep", "male"), true);
  assert.equal(matchesGender("non-binary/male", "male"), true);
});

test("female filter matches female voices and rejects male", () => {
  assert.equal(matchesGender("Female", "female"), true);
  assert.equal(matchesGender("Adult Female", "female"), true);
  assert.equal(matchesGender("Male", "female"), false);
});

test("all filter passes everything", () => {
  assert.equal(matchesGender("Male", "all"), true);
  assert.equal(matchesGender("Female", "all"), true);
  assert.equal(matchesGender(undefined, "all"), true);
});

test("non-string genders never match a specific filter", () => {
  assert.equal(matchesGender(undefined, "male"), false);
  assert.equal(matchesGender(null, "male"), false);
  assert.equal(matchesGender(42, "male"), false);
});
