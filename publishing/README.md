# Publishing QRX on Zapier

| File | What it holds |
|---|---|
| [`integration-settings.md`](integration-settings.md) | Title, description, category, logo, URLs, audience and role, field by field |
| [`triggers-and-actions.md`](triggers-and-actions.md) | Each trigger, action and search: noun, labels, help text, output fields, sample data |
| [`publishing-request.md`](publishing-request.md) | Integration checks, the 3 users, the reviewer test account, the review and the beta |
| [`logo-512.png`](logo-512.png) | The logo, 512 × 512 PNG |

## Before the owner starts

The API must have, on the site the version points at (dev first, then prod):

1. Per-resource OAuth audiences, so `/v1` accepts tokens issued for `<origin>/v1`.
2. `callbackUrl` on `POST /v1/codes`, with durable delivery of the finished code.
3. `completedAt` on codes, and `GET /v1/codes?status=succeeded&completedAfter=…` ordered by completion.

## Owner steps, in order

Run the commands from a clone of this repo after `npm ci`. Nothing here needs to run in CI.

1. **Zapier developer account.** Sign up at https://developer.zapier.com with an `@qrx.codes` address, and accept the
   developer terms. This account is the integration's admin (check M005).
2. **Sign in the CLI.** `npx zapier-platform login` (add `--sso` if the account signs in with SSO).
3. **Register the integration.** Run the command in
   [`integration-settings.md`](integration-settings.md#register-command). It writes `.zapierapprc`; commit that file.
4. **Get the redirect URI.** `npx zapier-platform describe` prints the OAuth redirect URI, in the form
   `https://zapier.com/dashboard/auth/oauth/return/App<id>CLIAPI/`.
5. **Dev Clerk app.** Replace the placeholder redirect URI on the dev Clerk application "QRX for Zapier" with the URI
   from step 4 (the API agent can do this).
6. **Push and point at dev.**
   ```sh
   npx zapier-platform push
   npx zapier-platform env:set 1.0.0 CLIENT_ID=<dev client id> CLIENT_SECRET=<dev client secret> \
     QRX_BASE_URL=https://dev.qrx.codes QRX_OAUTH_URL=https://summary-bobcat-19.clerk.accounts.dev
   ```
7. **Try it on dev.** In Zapier, connect a dev QRX account and make a Zap with Create QR Code followed by a step that
   uses the image file (for example, email it to yourself). Check the code arrives with its image. Then replay the
   Create QR Code run from the Zap history and check on dev that no second code was made; tell the API agent either
   way (whether Zapier reuses the callback URL on a replay is not documented).
8. **Prod Clerk app.** In the production Clerk dashboard (`clerk.qrx.codes`), create the OAuth application
   "QRX for Zapier": confidential (with a secret), PKCE required, consent screen on, scopes
   `qrx:read qrx:generate offline_access`, redirect URI from step 4.
9. **Point the version at prod.**
   ```sh
   npx zapier-platform env:unset 1.0.0 QRX_BASE_URL QRX_OAUTH_URL QRX_OAUTH_RESOURCE
   npx zapier-platform env:set 1.0.0 CLIENT_ID=<prod client id> CLIENT_SECRET=<prod client secret>
   ```
   Reconnect the QRX account in Zapier afterwards; dev connections stop working.
10. **Integration settings.** Upload `logo-512.png` and fill in the support, privacy and terms URLs from
    [`integration-settings.md`](integration-settings.md).
11. **Live test Zaps.** One Zap each for New QR Code, Create QR Code, Change QR Code Link (on an account with the paid
    features) and Find QR Code. Run each once successfully, leave them on and keep their history.
12. **Reviewer test account.** Set up `integration-testing@zapier.com` as in
    [`publishing-request.md`](publishing-request.md#reviewer-test-account).
13. **Three users.** Invite three real users from outside the QRX team (`npx zapier-platform users:add <email> 1.0.0`)
    and wait until each has a live Zap that uses QRX (check S001).
14. **Promote.** `npx zapier-platform promote 1.0.0`.
15. **Submit.** In the Developer Platform, open **Publishing**, fill in the request from
    [`publishing-request.md`](publishing-request.md) and click **Submit for Review**.
16. **Review and beta.** Zapier replies in about a week. Once approved, the integration is in beta for 90 days and then
    goes public on its own.

On Windows, `push` can fail copying the project (`EPERM` on `.git` objects, then `EMFILE`). Push from a clean export
with only runtime dependencies instead:

```sh
git archive HEAD | tar -x -C ../qrx-zapier-push && cd ../qrx-zapier-push
npm ci --omit=dev
npx zapier-platform-cli@19.2.0 push
```

Later versions: bump `version` in `package.json`, `npx zapier-platform push`, copy the environment with
`npx zapier-platform env:set <new version> …`, then `npx zapier-platform promote <new version>` and
`npx zapier-platform migrate <old version> <new version>`.
