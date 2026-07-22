# MiniKB Editor Workflow Upgrade

## Objective

Make long-form article editing comfortable and resilient: the toolbar remains available while scrolling, article actions are unambiguous, unsaved local work can be recovered, past saved versions can be restored safely, and reusable templates reduce repetitive KB authoring.

## Scope

This change affects the rich-text editor, new/edit article forms, the article page action layout, PocketBase setup and types, and focused support components. It does not add real-time collaboration, document-level permissions beyond existing roles, or granular text-diff rendering.

## Toolbar

The editor toolbar becomes a single non-wrapping strip that sticks beneath the global header while the editor scrolls through the viewport. It uses a fixed header offset only while sticky, so it does not reserve a blank gap in the editor at rest.

Essential controls remain directly visible: undo/redo, text style, basic marks, text and highlight color, lists, alignment, link, image upload, and table insertion. Lower-frequency controls move into a compact More menu: inline/block code, task list, blockquote, callouts, horizontal rule, image URL insertion, table row/column operations, and table deletion. On narrow widths the toolbar scrolls horizontally rather than wrapping; button dimensions and separators remain stable.

Every icon-only action keeps a native tooltip. Styling uses smaller consistent controls, compact group separators, and one visible row on desktop.

## Article Actions

The article detail header keeps Back and Edit only. The duplicate header delete button is removed. Deletion remains available once, in the sidebar Danger Zone, with its existing confirmation and attachment cleanup behavior.

## Local Recovery Drafts

New and edit forms persist a browser-local recovery snapshot after a short debounce while the form is dirty. A snapshot contains title, summary, HTML content, category, tags, company, pin/internal flags, draft state, and a timestamp. Keys are scoped to the editing context: one key per existing article and a separate key for a new article flow.

On form load, a snapshot is considered recoverable only when it is newer than the article's last server update or, for a new article, has meaningful content. The UI presents Restore and Discard controls without silently replacing form state. A successful draft save or publish clears the matching recovery snapshot. Browser storage failures are non-fatal and do not block editing.

## Revision History

PocketBase gains an `article_revisions` collection. Each record stores the article relation, revision number, title, summary, content, category, tags, company, flags, save mode, actor, and creation time. Editors can create and read revisions; only administrators can delete them. A revision is created from the current article state immediately before every explicit update save or publish. New articles do not create a revision until their first later edit.

The edit sidebar provides a compact Revision History panel. It lists recent versions with timestamp, author when available, and draft/live state. Selecting Restore populates the edit form with that snapshot and marks the form dirty; it does not modify the live record until the user saves. The interface retains the most recent 30 revisions per article, removing the oldest revision only after the new revision is stored successfully.

## Reusable Templates

PocketBase gains an `article_templates` collection with a name, optional description, title, summary, content, category, tags, default visibility flags, optional company relation, creator, and timestamps. Editors can create, view, update, and apply templates; only administrators can delete them.

The new-article form includes a compact template picker before the main fields. Applying a template fills fields but does not save an article. If the form already has meaningful content, applying requires confirmation. The edit sidebar includes Save as Template, which opens a small dialog for the template name and description. A dedicated `/articles/templates` page supports rename, description changes, and deletion.

## Data Flow And Error Handling

Client forms use the existing PocketBase helper functions and role checks. Revision creation failure blocks an article update and surfaces a specific error so an edit cannot save without the promised restore point. Template and recovery failures are isolated: they show a local message while preserving unsaved form state.

Template application and revision restore are local form operations. Article attachment behavior, existing unsaved-change prompts, AI drafting, folders, and company assignment remain unchanged.

## Testing And Verification

Tests cover recovery key generation, meaningful recovery detection, revision trimming, and template payload conversion as pure helpers. The implementation is verified with TypeScript, production build, and editor checks at desktop and mobile widths: a long article keeps the toolbar directly below the header without a static gap, controls do not wrap, the More menu remains usable, and header deletion is absent.

## Success Criteria

- The editor toolbar stays accessible during long edits without hiding behind the app header or reserving an empty top area.
- Desktop editing tools occupy one compact row; narrow screens use horizontal scrolling rather than a broken second row.
- There is one delete action on an article page.
- A closed or navigated-away dirty form offers recovery on return without overwriting content automatically.
- Every explicit edit save has a restorable backend revision, capped at 30 per article.
- Templates can be applied to a new article, saved from an existing one, and managed in one location.
