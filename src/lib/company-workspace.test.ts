import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import test from "node:test";
import React from "react";
import ts from "typescript";
import * as workspace from "./client-workspace.ts";
import { PROGRAMMATIC_NAVIGATION_EVENT, runGuardedNavigation } from "../hooks/use-unsaved-changes-guard.ts";

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

test("recognizes article, asset and company detail/edit records with safely decoded IDs", () => {
  assert.equal(typeof workspace.parseWorkspaceRecordRoute, "function");
  for (const collection of ["articles", "assets", "companies"]) {
    for (const suffix of ["", "/", "/edit", "/edit/"]) {
      assert.deepEqual(workspace.parseWorkspaceRecordRoute(`/${collection}/record%201${suffix}`), {
        collection, id: "record 1",
      });
    }
  }
  assert.deepEqual(workspace.parseWorkspaceRecordRoute("/articles/caf%C3%A9"), { collection: "articles", id: "caf\u00e9" });
  assert.deepEqual(workspace.parseWorkspaceRecordRoute("/assets/record%25id/edit"), { collection: "assets", id: "record%id" });
});

test("does not treat static pages, malformed IDs or unrelated paths as workspace records", () => {
  assert.equal(typeof workspace.parseWorkspaceRecordRoute, "function");
  for (const pathname of [
    "/", "/articles", "/articles/", "/articles/new", "/articles/favorites", "/articles/folders", "/articles/templates",
    "/articles/new/", "/articles/favorites/", "/articles/folders/", "/articles/templates/",
    "/articles/%66avorites", "/articles/%6Eew", "/articles/templates/edit",
    "/assets", "/assets/new", "/companies", "/companies/new", "/companies/new/edit", "/profile", "/admin",
    "/articles/%", "/assets/%E0%A4%A", "/companies/%FF", "/articles/%2F", "/assets/%5C", "/companies/%00",
    "/articles/%20", "/articles//edit", "/articles/id/delete", "/assets/id/edit/extra", "/companies/id/assets",
  ]) {
    assert.equal(workspace.parseWorkspaceRecordRoute(pathname), null, pathname);
  }
});

type RequestResult = { items: Record<string, unknown>[]; totalItems: number };
type PendingRequest = {
  collection: string;
  params: URLSearchParams;
  resolve: (items: Record<string, unknown>[], totalItems?: number) => void;
  reject: (error: Error) => void;
};

// Run the real component functions with controlled hooks and pending network requests.
const compiledComponents = new Map<string, (require: (id: string) => unknown, module: object, exports: object) => void>();

function componentHarness(name: "app-header" | "app-sidebar") {
  const require = createRequire(import.meta.url);
  const states: unknown[] = [];
  const memos = new Map<number, { dependencies: unknown[]; value: unknown }>();
  const effects = new Map<number, { dependencies: unknown[]; cleanup?: () => void }>();
  const pendingEffects = new Map<number, { dependencies: unknown[]; effect: () => (() => void) | void }>();
  const requests: PendingRequest[] = [];
  const actions: string[] = [];
  let hookIndex = 0;
  let pathname = "/";
  let searchParams = new URLSearchParams();
  const sameDependencies = (left: unknown[], right: unknown[]) => left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const react = {
    ...React,
    useState(initial: unknown) {
      const index = hookIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next: unknown) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      }];
    },
    useMemo(factory: () => unknown, dependencies: unknown[]) {
      const index = hookIndex++;
      const previous = memos.get(index);
      if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
        memos.set(index, { dependencies, value: factory() });
      }
      return memos.get(index)!.value;
    },
    useEffect(effect: () => (() => void) | void, dependencies: unknown[]) {
      const index = hookIndex++;
      const previous = effects.get(index);
      if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
        pendingEffects.set(index, { dependencies, effect });
      }
    },
  };
  if (!compiledComponents.has(name)) {
    const { outputText } = ts.transpileModule(
      readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    );
    compiledComponents.set(name, runInThisContext(`(function(require, module, exports) {${outputText}\n})`));
  }
  const componentModule = { exports: {} as { default: (props: object) => React.ReactNode } };
  compiledComponents.get(name)!((id: string) => {
    if (id === "react") return react;
    if (id === "next/link") return { default: "a" };
    if (id === "next/navigation") return {
      usePathname: () => pathname,
      useSearchParams: () => searchParams,
      useRouter: () => ({
        push: (href: string) => { actions.push(`push:${href}`); },
        replace: (href: string) => { actions.push(`replace:${href}`); },
        refresh: () => { actions.push("refresh"); },
      }),
    };
    if (id === "@/lib/client-workspace") return workspace;
    if (id === "@/hooks/use-unsaved-changes-guard") return { runGuardedNavigation };
    if (id === "@/lib/pocketbase/client") return {
      signOut: () => { actions.push("signOut"); },
      getClientRecords: (collection: string, params: URLSearchParams) => new Promise<RequestResult>((resolve, reject) => {
        requests.push({ collection, params, reject, resolve: (items, totalItems = items.length) => resolve({ items, totalItems }) });
      }),
    };
    if (id.startsWith("@/components/")) return { default: () => null };
    if (id.startsWith("@/lib/")) return require(`./${id.slice("@/lib/".length)}.ts`);
    return require(id);
  }, componentModule, componentModule.exports);

  return {
    actions, requests,
    render(nextPathname = pathname, query = searchParams.toString()) {
      pathname = nextPathname;
      if (query !== searchParams.toString()) searchParams = new URLSearchParams(query);
      hookIndex = 0;
      return componentModule.exports.default({
        role: "editor",
        profile: { id: "user-1", role: "editor", username: "Editor", full_name: null, email: null },
      });
    },
    flushEffects() {
      const queued = Array.from(pendingEffects.entries());
      pendingEffects.clear();
      for (const [index, pending] of queued) {
        effects.get(index)?.cleanup?.();
        const cleanup = pending.effect();
        effects.set(index, { dependencies: pending.dependencies, cleanup: cleanup || undefined });
      }
    },
    dispose() { for (const effect of effects.values()) effect.cleanup?.(); },
  };
}

function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as React.ReactNode)];
}

function text(node: React.ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return React.isValidElement<Record<string, unknown>>(node) ? text(node.props.children as React.ReactNode) : "";
}

function hrefs(node: React.ReactNode) {
  return elements(node).map((element) => element.props.href).filter((href) => typeof href === "string");
}

function settleRequests() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

for (const component of ["app-header", "app-sidebar"] as const) {
  test(`${component} makes no record requests for static article, asset or company pages`, () => {
    const harness = componentHarness(component);
    try {
      for (const pathname of ["/articles", "/articles/new", "/articles/favorites", "/articles/folders", "/articles/templates", "/assets/new", "/companies/new"]) {
        harness.render(pathname);
        harness.flushEffects();
        assert.equal(harness.requests.length, 0, pathname);
      }
    } finally { harness.dispose(); }
  });

  test(`${component} requests real article and asset records on detail and edit routes`, () => {
    const harness = componentHarness(component);
    try {
      for (const collection of ["articles", "assets"]) {
        for (const suffix of ["", "/edit"]) {
          harness.render(`/${collection}/record%201${suffix}`);
          harness.flushEffects();
          const request = harness.requests.at(-1)!;
          assert.equal(request.collection, collection);
          assert.equal(request.params.get("fields"), "id,company_id");
          assert.equal(request.params.get("filter"), 'id = "record 1"');
        }
      }
    } finally { harness.dispose(); }
  });

  test(`${component} safely ignores malformed URI segments`, () => {
    const harness = componentHarness(component);
    try {
      for (const pathname of ["/articles/%", "/assets/%FF/edit", "/companies/%E0%A4%A"]) {
        harness.render(pathname);
        harness.flushEffects();
        assert.equal(harness.requests.length, 0, pathname);
      }
    } finally { harness.dispose(); }
  });

  for (const destination of ["/articles/next", "/assets/old", "/articles/favorites", "/articles/folders", "/articles/templates"]) {
    test(`${component} never renders the previous record's client context on ${destination}`, async () => {
      const harness = componentHarness(component);
      try {
        harness.render("/articles/old");
        harness.flushEffects();
        harness.requests[0].resolve([{ id: "old", company_id: "client-a" }]);
        await settleRequests();
        harness.render();
        harness.flushEffects();
        for (const request of harness.requests.slice(1)) {
          request.resolve(request.collection === "companies" ? [{ id: "client-a", name: "Client A", website: "https://a.example" }] : [], 17);
        }
        await settleRequests();
        assert.match(text(harness.render()), /Client A/);

        const nextTree = harness.render(destination);
        assert.doesNotMatch(text(nextTree), /Client A|Client KB/);
        assert.ok(hrefs(nextTree).every((href) => !href.includes("client-a")));
        if (component === "app-sidebar") assert.equal(nextTree, null);
        const requestCount = harness.requests.length;
        harness.flushEffects();
        if (["/articles/favorites", "/articles/folders", "/articles/templates"].includes(destination)) {
          assert.equal(harness.requests.length, requestCount);
        } else {
          assert.equal(harness.requests.at(-1)?.params.get("fields"), "id,company_id");
        }
      } finally { harness.dispose(); }
    });
  }

  test(`${component} hides the old company's name and counts while the next company loads`, async () => {
    const harness = componentHarness(component);
    try {
      harness.render("/companies/client-a");
      harness.flushEffects();
      for (const request of harness.requests) {
        request.resolve(request.collection === "companies" ? [{ id: "client-a", name: "Client A", website: "https://a.example" }] : [], 17);
      }
      await settleRequests();
      assert.match(text(harness.render()), /Client A/);
      const nextTree = harness.render("/companies/client-b/edit");
      assert.doesNotMatch(text(nextTree), /Client A|a\.example|17|34/);
      if (component === "app-sidebar") assert.ok(hrefs(nextTree).some((href) => href.includes("client-b")));
      else assert.match(text(nextTree), /Client KB/);
      assert.ok(hrefs(nextTree).every((href) => !href.includes("client-a")));
      harness.flushEffects();
    } finally { harness.dispose(); }
  });

  test(`${component} preserves seeded creation links without applying companyId to static lists`, () => {
    const harness = componentHarness(component);
    try {
      for (const pathname of ["/articles/new", "/assets/new"]) {
        const tree = harness.render(pathname, "companyId=client%201");
        assert.ok(hrefs(tree).includes(component === "app-sidebar" ? "/articles/new?companyId=client%201" : "/articles/new"));
        if (component === "app-header") assert.match(text(tree), /Client KB/);
      }
      const staticTree = harness.render("/articles/favorites", "companyId=client%201");
      assert.doesNotMatch(text(staticTree), /Client KB/);
      assert.ok(hrefs(staticTree).every((href) => !href.includes("companyId=")));
    } finally { harness.dispose(); }
  });
}

test("logout is cancelled before signOut and navigates with refresh only after the guard allows it", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = Object.assign(new EventTarget(), { location: { href: "/articles/old/edit" } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  const harness = componentHarness("app-header");
  try {
    const menuButton = elements(harness.render()).find((element) => element.type === "button")!;
    (menuButton.props.onClick as () => void)();
    const logout = elements(harness.render()).find((element) => element.type === "button" && text(element).includes("Logout"))!;
    const cancel = (event: Event) => event.preventDefault();
    browser.addEventListener(PROGRAMMATIC_NAVIGATION_EVENT, cancel);
    await (logout.props.onClick as () => void)();
    assert.deepEqual(harness.actions, []);
    assert.equal(browser.location.href, "/articles/old/edit");
    browser.removeEventListener(PROGRAMMATIC_NAVIGATION_EVENT, cancel);
    browser.addEventListener(PROGRAMMATIC_NAVIGATION_EVENT, () => { harness.actions.push("guard"); });
    await (logout.props.onClick as () => void)();
    assert.deepEqual(harness.actions, ["guard", "signOut", "replace:/login", "refresh"]);
    assert.equal(browser.location.href, "/articles/old/edit");
  } finally {
    harness.dispose();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
