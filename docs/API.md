mkdir -p docs
cat > docs/API.md <<'EOF'
# Portfolio API

Server-side storage for CS100 Power Up!, implemented in `api/portfolios.php`.

- **Endpoint:** `/api/portfolios.php`
- **Methods:** `GET`, `POST`
- **Format:** JSON (UTF-8) for both request and response
- **Storage:** `/var/www/data/portfolios.json`, kept outside the web folder so it cannot be downloaded by URL

All responses are sent with `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

## Limits

| Limit | Value |
|---|---|
| Request body size | 1 MB (1,048,576 bytes) |
| Portfolios stored | 500 |
| Items per portfolio | 200 |

## GET /api/portfolios.php

Returns all stored portfolios as a JSON array. Returns `[]` if nothing has been saved yet.

**Response 200**

```json
[
  {
    "id": "p1",
    "displayName": "Candy",
    "enjoy": "Cars and coding",
    "tried": "HTML and CSS",
    "curious": "Cloud",
    "items": []
  }
]
```

## POST /api/portfolios.php

Receives a **JSON array of portfolios**, validates everything again on the server, merges it into the stored data and saves it.

**Request headers:** `Content-Type: application/json` (required)

**Request body:** a JSON array (nesting depth up to 32). A JSON object such as `{}` is not a list; note that an empty `{}` or `[]` decodes to an empty list, so it is accepted and saves nothing.

**Example request**

```json
[
  {
    "id": "p1",
    "displayName": "Candy",
    "enjoy": "Cars and coding",
    "tried": "HTML and CSS",
    "curious": "Cloud",
    "items": [
      {
        "id": "i1",
        "title": "My first website",
        "type": "Project",
        "date": "2026-11-20",
        "role": "Developer",
        "description": "Built a one-page portfolio site.",
        "skills": ["HTML", "CSS"],
        "reflection": {
          "whatIDid": "Built the page",
          "whatILearned": "Layouts",
          "challenge": "Responsive design",
          "nextStep": "Add JavaScript"
        },
        "evidence": ["https://github.com/example/repo"]
      }
    ]
  }
]
```

**Response 200**

```json
{ "ok": true, "portfolios": 1 }
```

`portfolios` is the total number of portfolios stored after merging.

### Merge behaviour

- A portfolio with a new `id` is added.
- A portfolio with an existing `id` has `displayName`, `enjoy`, `tried`, `curious` overwritten by the incoming values.
- Items are merged by item `id`: the same `id` replaces the stored item, a new `id` is added. Items not included in the request are kept (nothing is deleted).
- Unknown fields are dropped; only known fields are stored.

## Error format

```json
{ "error": "Validation failed", "details": ["portfolios[0].id is invalid"] }
```

`details` is an array of messages (at most 20) and is empty for errors that have no field-level detail.

**Example: `POST [{"displayName":""}]` returns 422**

```json
{
  "error": "Validation failed",
  "details": [
    "portfolios[0].id is invalid",
    "portfolios[0].displayName is required (max 80 characters)",
    "portfolios[0].enjoy must be text (max 2000 characters)",
    "portfolios[0].tried must be text (max 2000 characters)",
    "portfolios[0].curious must be text (max 2000 characters)",
    "portfolios[0].items must be a list of up to 200 items"
  ]
}
```

## Error codes

| Code | Message | Meaning / when it happens |
|---|---|---|
| 400 | `Empty request body` | POST body is empty. |
| 400 | `Body must be a JSON array of portfolios` | Body is not valid JSON, is nested too deeply, or is not a JSON array. |
| 405 | `Method not allowed` | Method is not GET or POST. The `Allow: GET, POST` header is returned. |
| 413 | `Request body is too large` | POST body is larger than 1 MB. |
| 415 | `Content-Type must be application/json` | POST was sent without a `Content-Type` that starts with `application/json`. |
| 422 | `Validation failed` | One or more fields break the validation rules below; see `details`. |
| 422 | `Too many portfolios` | The merged result would hold more than 500 portfolios. |
| 500 | `Server storage is not available` | `/var/www/data` does not exist or is not writable by the web server. |
| 500 | `Could not open lock file` | The lock file `portfolios.lock` could not be opened. |
| 500 | `Could not read stored data` | The data file exists but could not be read. |
| 500 | `Stored data is corrupted` | The data file is not valid JSON for a list. |
| 500 | `Could not encode data` / `Could not write data` / `Could not save data` | The merged data could not be encoded, written to a temp file, or moved into place. |

## Validation rules

### Text fields

A "text" field must be:

- a string
- valid UTF-8
- free of control characters (tab, newline and carriage return are allowed)
- within its maximum length, counted in characters
- at least the minimum length after trimming whitespace

### IDs

`id` (portfolio and item) must be a string of 1-100 characters using only `A-Z a-z 0-9 . _ -`. IDs must be unique within their list (duplicates return an error).

### Portfolio object

| Field | Required | Rule |
|---|---|---|
|id` | yes | ID rule above |
| `displayName` | yes | text, 1-80 characters |
| `enjoy` | yes (may be `""`) | text, 0-2000 characters |
| `tried` | yes (may be `""`) | text, 0-2000 characters |
| `curious` | yes (may be `""`) | text, 0-2000 characters |
| `items` | yes (may be `[]`) | list of up to 200 item objects |

### Item object

| Field | Required | Rule |
|---|---|---|
| `id` | yes | ID rule above |
| `title` | yes | text, 1-150 characters |
| `type` | yes | text, 1-80 characters |
| `date` | yes | real calendar date in `YYYY-MM-DD` format, year 1900-2100 |
| `role` | yes | text, 1-100 characters |
| `description` | yes | text, 1-2000 characters |
| `skills` | yes (may be `[]`) | list of up to 30 texts, each 1-50 characters |
| `reflection` | yes | object with the four keys below |
| `reflection.whatIDid` | yes (may be `""`) | text, 0-2000 characters |
| `reflection.whatILearned` | yes (may be `""`) | text, 0-2000 characters |
| `reflection.challenge` | yes (may be `""`) | text, 0-2000 characters |
| `reflection.nextStep` | yes (may be `""`) | text, 0-2000 characters |
| `evidence` | yes (may be `[]`) | list of up to 20 URLs |

### URL rule (`evidence[]`)

Each URL must be a string of at most 500 characters, contain no whitespace or control characters, use the `http` or `https` scheme, and include a host.

