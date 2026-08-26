# MiniKB Navigation Performance Design

## Goal

Reduce the delay between an internal navigation action and usable page content across local development and the deployed Cloudflare application without weakening authentication, exposing private KB data, or introducing stale cross-request caches.

## Measured Problem

The deployed PocketBase health endpoint takes about 1.05 seconds to return from the current development location. Several MiniKB pages perform independent PocketBase requests sequentially:

- The dashboard loads five collections one after another.
- The articles page loads articles, companies, managed folders, and article categories through sequential calls.
- The companies page loads companies, article counts, and asset counts sequentially.
- Article and asset detail pages wait for secondary records one at a time.

The root layout and page authorization also independently call `getServerUser`, producing duplicate user lookups during a single render. Some client actions use `window.location.href`, which discards the existing Next.js shell and performs a full document navigation. There is no route loading boundary, so server latency can look like an ignored click.

## Chosen Approach

### Request-scoped authentication

Memoize `getServerAuth` and `getServerUser` with React server `cache`. The cache is scoped to one server render, so the root layout and page guards share one authenticated user lookup without persisting identity data between users or requests.

Authorization continues to validate the current PocketBase user record. MiniKB will not trust the editable user object stored beside the token in the browser cookie for role checks.

### Concurrent data loading

Run independent PocketBase reads with `Promise.allSettled` or small safe loader helpers. Each page keeps its current fallback behavior when a collection is unavailable.

Apply this to:

- dashboard collections;
- article list, companies, and folder/category data;
- companies with article and asset counts;
- article attachments and relationship candidates;
- asset company and attachment data;
- create/edit form option lists;
- folder metadata helpers.

Queries that depend on a previously loaded record remain sequential. For example, an article must load before its attachment filter can use the article ID.

### Client-side navigation and prefetching

Use Next.js `router.push` for internal search and post-save navigation instead of `window.location.href`. Keep hard navigation for sign-out because clearing authentication should start a clean document session.

Replace client workspace navigation buttons with `Link` elements so Next.js can prefetch their route payloads. Preserve current active states, scroll behavior, accessibility, and visual styling.

### Immediate route feedback

Add an App Router `loading.tsx` boundary containing a restrained workspace skeleton. The persistent header and client sidebar remain visible while the destination server component loads. The indicator must not claim that data has loaded and must respect reduced-motion preferences.

### Cache safety

Keep private PocketBase reads and application responses uncached across requests. Existing no-store and Cloudflare error-page protections remain. Cross-request caching may be considered later only with explicit user-scoped keys and mutation invalidation.

## Error Handling

Independent collection failures continue to degrade to empty sections rather than failing an entire dashboard or collection page. Required primary records retain their current not-found behavior. Authentication failures still redirect to login through the existing guards.

## Testing

- Add regression coverage proving server authentication functions are request-memoized.
- Add source-level architecture checks for concurrent independent page loaders and the absence of internal hard navigation in the optimized flows.
- Verify the loading boundary and prefetch-capable client navigation exist.
- Run the full Node test suite, ESLint, Next.js production build, and OpenNext Cloudflare bundle.

## Success Criteria

- A page performs no duplicate authenticated user lookup within one render.
- Independent data requests begin together rather than waiting serially.
- Internal navigation preserves the application shell.
- Every uncached route transition displays immediate visual feedback.
- No private data is cached across users or requests.
- Existing behavior, permissions, filtering, and error fallbacks remain intact.
