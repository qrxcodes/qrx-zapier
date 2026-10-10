# QRX for Zapier

The [QRX](https://qrx.codes) integration for Zapier. QRX turns a picture prompt and a link into a branded,
print-ready QR code, decodes the finished image to check it scans, and hosts the qrx.to short link the code points at.

Built with the [Zapier Platform CLI](https://docs.zapier.com/integrations/build-cli/overview) on the public
[QRX REST API](https://qrx.codes/developers/docs) ([OpenAPI](https://qrx.codes/v1/openapi.json)).

## What it does

| Kind | Name | What it does |
|---|---|---|
| Action | **Create QR Code** | Makes a code from a picture prompt, a link and an optional style. Returns the code's id, short link, page URL and the PNG as a file for later steps. |
| Action | **Change QR Code Link** | Points an existing code somewhere else, on a paid plan. Printed codes follow at once. |
| Search | **Find QR Code** | Finds a code by its id, short link or page URL. |
| Trigger | **New QR Code** | Fires when a code is finished and ready to use (polling). |

Sign-in is OAuth 2 with a QRX account (authorisation code with PKCE, refresh tokens rotated). QRX's sign-in runs on
Clerk at `clerk.qrx.codes`.

## How a code gets made

A code takes about a minute, and Zapier gives each step 30 seconds. Create QR Code uses Zapier's callback flow:

1. `perform` gets a callback URL from `z.generateCallbackUrl()` and sends it to `POST /v1/codes` as `callbackUrl`, with
   an `Idempotency-Key` derived from the callback URL (`zapier-<sha256>`). It returns the code's id and short link at
   once.
2. When the code succeeds or fails, QRX POSTs the code to the callback URL. Zapier then runs `performResume`.
3. `performResume` reads the code from `GET /v1/codes/{id}` with the user's token (the callback body is only a signal),
   errors the step if the code failed, and otherwise returns the code with its image as a file.

If Zapier repeats the step with the same callback URL, the key is the same and the API answers with the first code, so
no second code is made or counted. A `409 idempotency-in-progress` answer is retried with the same key.

New QR Code asks for `GET /v1/codes?status=succeeded&completedAfter=<an hour ago>&limit=100`, follows `nextCursor`
for up to 20 pages or 20 seconds, and returns codes newest first by `completedAt`. Zapier drops ids it has already
seen.

The image is a dehydrated file: Zapier downloads the PNG only when a later step (Slack, Drive, email) uses it.

### API contract this build relies on

- `POST /v1/codes` accepts `callbackUrl`, and QRX POSTs the `GET /v1/codes/{id}` body to it when the code succeeds or
  fails.
- Codes have `completedAt`, and `GET /v1/codes` accepts `status=succeeded` and `completedAfter=<ISO time>`, ordered by
  completion time, newest first.
- `/v1` accepts access tokens issued for the resource `https://qrx.codes/v1`.

## Develop

Node 22 (any Node 20 or later works).

```sh
npm ci
npm run lint
npm test
npm run validate   # zapier-platform validate: schema checks, then Zapier's integration checks
```

Tests use `zapier-platform-core`'s app tester with [nock](https://github.com/nock/nock) mocks for the QRX API and
Clerk, so they run offline. `npx zapier-platform validate --without-style` skips the online checks.

## Configuration

Set with `npx zapier-platform env:set <version> NAME=value`, or in `.environment` for local runs.

| Variable | Default | Purpose |
|---|---|---|
| `CLIENT_ID` | (required) | The "QRX for Zapier" OAuth application's client ID |
| `CLIENT_SECRET` | (required) | Its client secret |
| `QRX_BASE_URL` | `https://qrx.codes` | The QRX site whose `/v1` API is called |
| `QRX_OAUTH_URL` | `https://clerk.qrx.codes` | The OAuth server (`/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`) |
| `QRX_OAUTH_RESOURCE` | `<QRX_BASE_URL>/v1` | The RFC 8707 resource the token is issued for |

For dev: `QRX_BASE_URL=https://dev.qrx.codes` and `QRX_OAUTH_URL=https://summary-bobcat-19.clerk.accounts.dev`.

Scopes requested: `qrx:read qrx:generate offline_access`. The connection is named after the account's email when
Clerk's userinfo returns one; adding the `email` scope to the Clerk application and to `SCOPES` in `lib/config.js`
makes sure it does.

## Publish

`publishing/` has the settings, listing copy and step-by-step owner tasks for Zapier's integration settings and the
publishing request.

## Licence

[MIT](LICENSE)
