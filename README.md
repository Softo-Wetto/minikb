# MiniKB

MiniKB is a Next.js knowledge base frontend wired to the self-hosted PocketBase
instance documented for the Docs app:

```env
NEXT_PUBLIC_POCKETBASE_URL=https://minikb.duckdns.org
```

The PocketBase admin UI is available at:

```text
https://minikb.duckdns.org/_/
```

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Logs And Debugging

For frontend/server-render logs, run the app in a visible VS Code terminal:

```powershell
npm run dev
```

If port `3000` is already occupied by a hidden dev server:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID>
npm run dev
```

For browser-side create/update failures, open DevTools -> Network, click the
failed `/api/collections/.../records` request, and check the response body.

For PocketBase server logs on the VPS:

```bash
sudo journalctl -u pb-docs -f
sudo journalctl -u caddy -f
```

PocketBase also exposes request/application logs in the admin UI:

```text
https://minikb.duckdns.org/_/
```

## Expected PocketBase Collections

You can create/update the MiniKB collections from this repo with:

```powershell
$env:POCKETBASE_URL="https://minikb.duckdns.org"
$env:POCKETBASE_SUPERUSER_EMAIL="you@example.com"
$env:POCKETBASE_SUPERUSER_PASSWORD="your-pocketbase-password"
npm run pb:setup
```

The script creates/updates `users`, `companies`, `articles`, `assets`, and
`attachments` using PocketBase's Collections API.

CSV imports update existing users without changing their password. To reset
imported user passwords intentionally, set:

```powershell
$env:MINIKB_IMPORTED_USER_PASSWORD="new-password"
$env:MINIKB_RESET_IMPORTED_USER_PASSWORDS="true"
npm run pb:import
```

Use PocketBase's built-in `users` auth collection and add these fields:

| Field | Type | Notes |
| --- | --- | --- |
| `full_name` | Text | Optional display name |
| `role` | Select | `admin`, `editor`, `viewer`; default `viewer` |
| `legacy_id` | Text | Original Supabase UUID for imports |

Create these base collections:

### `articles`

| Field | Type |
| --- | --- |
| `title` | Text |
| `legacy_id` | Text |
| `slug` | Text |
| `summary` | Text |
| `content` | Editor/Text |
| `company_id` | Relation to `companies`, optional |
| `category` | Text |
| `tags` | JSON |
| `is_pinned` | Bool |
| `is_internal` | Bool |
| `created_by` | Relation to `users`, optional |

### `companies`

| Field | Type |
| --- | --- |
| `name` | Text |
| `legacy_id` | Text |
| `slug` | Text |
| `description` | Text |
| `website` | Url/Text |
| `created_by` | Relation to `users`, optional |

### `assets`

| Field | Type |
| --- | --- |
| `company_id` | Relation to `companies`, optional |
| `legacy_id` | Text |
| `name` | Text |
| `asset_type` | Select/Text |
| `description` | Text |
| `metadata` | JSON |
| `created_by` | Relation to `users`, optional |

### `attachments`

| Field | Type |
| --- | --- |
| `article_id` | Relation to `articles` |
| `legacy_id` | Text |
| `asset_id` | Relation to `assets`, optional |
| `file` | File |
| `file_name` | Text |
| `file_path` | Text |
| `file_size` | Number |
| `mime_type` | Text |
| `uploaded_by` | Relation to `users`, optional |

PocketBase supplies `created` and `updated` automatically. The frontend maps
those to the old `created_at`/`updated_at` names internally.

