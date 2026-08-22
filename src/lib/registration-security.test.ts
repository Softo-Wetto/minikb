import assert from "node:assert/strict";
import test from "node:test";

type AccessPolicyModule = {
  publicRegistrationEnabled: boolean;
  userCollectionRules: {
    createRule: string;
    updateRule: string;
  };
};

async function loadAccessPolicy(): Promise<AccessPolicyModule | null> {
  try {
    return await import("../../scripts/access-policy.mjs") as AccessPolicyModule;
  } catch {
    return null;
  }
}

test("allows only administrators to create MiniKB user accounts", async () => {
  const policy = await loadAccessPolicy();

  assert.equal(policy?.publicRegistrationEnabled, false);
  assert.equal(policy?.userCollectionRules.createRule, '@request.auth.role = "admin"');
});

test("allows profile updates without allowing users to promote their own role", async () => {
  const policy = await loadAccessPolicy();

  assert.equal(
    policy?.userCollectionRules.updateRule,
    '(@request.auth.id = id && @request.body.role:changed = false) || @request.auth.role = "admin"'
  );
});
