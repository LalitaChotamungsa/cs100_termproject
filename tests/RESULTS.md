# Issue #25: Server Validation Test Results

| Payload | Expected | Actual |
|---|---|---|
| `valid.json` | HTTP 200; accepted | HTTP 200; `{"ok":true,"portfolios":3}` |
| `missing-title.json` | HTTP 422; rejected for missing title | HTTP 422; `portfolios[0].items[0].title is required (max 150 characters)` |
| `bad-date.json` | HTTP 422; rejected for invalid date | HTTP 422; `portfolios[0].items[0].date must be a real date as YYYY-MM-DD` |
| `bad-evidence-url.json` | HTTP 422; rejected for invalid evidence URL | HTTP 422; `portfolios[0].items[0].evidence[0] must be a valid http(s) link` |
| `title-too-long.json` | HTTP 422; rejected because title exceeds 150 characters | HTTP 422; `portfolios[0].items[0].title is required (max 150 characters)` |