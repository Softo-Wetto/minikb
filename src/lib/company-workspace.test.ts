import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCompanyIconSources,
  getCompanyWebsiteHostname,
} from "./company-branding.ts";
import {
  companyWorkspaceHref,
  normalizeClientView,
} from "./client-workspace.ts";

test("derives privacy-safe icon candidates from a company website", () => {
  assert.deepEqual(getCompanyIconSources("www.example.com/support"), [
    "https://www.example.com/favicon.ico",
    "https://www.example.com/apple-touch-icon.png",
  ]);
  assert.equal(getCompanyWebsiteHostname("https://www.example.com/support"), "example.com");
});

test("does not create icon requests for malformed or unsupported websites", () => {
  assert.deepEqual(getCompanyIconSources("javascript:alert(1)"), []);
  assert.deepEqual(getCompanyIconSources("not a website"), []);
  assert.equal(getCompanyWebsiteHostname(""), "");
});

test("normalizes client views and creates navigation without hash anchors", () => {
  assert.equal(normalizeClientView("articles"), "articles");
  assert.equal(normalizeClientView("assets"), "assets");
  assert.equal(normalizeClientView("anything-else"), "overview");
  assert.equal(companyWorkspaceHref("client 1", "overview"), "/companies/client%201");
  assert.equal(
    companyWorkspaceHref("client 1", "articles"),
    "/companies/client%201?view=articles",
  );
  assert.equal(
    companyWorkspaceHref("client 1", "assets"),
    "/companies/client%201?view=assets",
  );
  assert.equal(
    companyWorkspaceHref("client 1", "articles", 3),
    "/companies/client%201?view=articles&page=3",
  );
});

test("routes inbound asset links through the stable client workspace view", () => {
  const assetPage = readFileSync("src/app/assets/[id]/page.tsx", "utf8");
  const adminPage = readFileSync("src/app/admin/page.tsx", "utf8");

  assert.doesNotMatch(assetPage, /#assets/);
  assert.match(assetPage, /companyWorkspaceHref\(company\.id, "assets"\)/);
  assert.doesNotMatch(adminPage, /\/companies\/\$\{company\.id\}\/assets/);
  assert.match(adminPage, /companyWorkspaceHref\(company\.id, "assets"\)/);
});
