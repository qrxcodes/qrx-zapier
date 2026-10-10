# Publishing request

What Zapier checks and asks for when the integration is submitted, and the answers.

## Before submitting: integration checks

These block the **Submit for Review** button until they pass.

| Check | What it needs | Plan |
|---|---|---|
| S001 | At least **3 users with a live Zap** using the integration | Three real people outside the QRX team (see below). |
| S002, T001 | A live Zap with a successful run for every visible trigger, action and search | One test Zap each for New QR Code, Create QR Code, Change QR Code Link and Find QR Code, run once, left on and never deleted. |
| M005 | An admin team member with an email on the app's own domain | The Zapier account that registers the integration uses an `@qrx.codes` address. |
| Logo | At least 256 × 256 | `logo-512.png`. |
| Terms | Developer terms accepted | When the account is created. |
| Validation | No errors from `zapier-platform validate` | Passes in CI on every push. |

The live Zaps for S002 and T001 count toward S001 only if they belong to other users, so the three users need their
own Zaps.

### The 3 users

Zapier counts users with a live Zap that uses the integration. They must be real users, not QRX staff accounts. While
the integration is private, invite them with:

```sh
npx zapier-platform users:add someone@example.com 1.0.0
```

or share the invite link from **Manage → Sharing** in the Developer Platform. Each one connects their own QRX account
and turns on a Zap that uses QRX (for example, Google Sheets new row → Create QR Code → Google Drive upload).

## Requirements Zapier reviews

| Requirement | Answer |
|---|---|
| Production API | The published version calls `https://qrx.codes/v1` and signs in at `https://clerk.qrx.codes`. No `QRX_BASE_URL`, `QRX_OAUTH_URL` or `QRX_OAUTH_RESOURCE` is set on it. |
| HTTPS only | Yes. |
| No hard-coded credentials | The client ID and secret are environment variables (`CLIENT_ID`, `CLIENT_SECRET`). |
| API documentation | `https://qrx.codes/developers/docs` covers every endpoint the integration uses; OpenAPI at `https://qrx.codes/v1/openapi.json`. |
| Name and description | "QRX"; "QRX is a QR code maker that turns a picture prompt and a link into a branded, print-ready code, checked to scan before delivery." |
| Homepage | `https://qrx.codes` (marketing site). |
| English | All user-facing text is English. |
| Test account | Below. |

## Reviewer test account

Zapier's reviewers sign in as **`integration-testing@zapier.com`**. The account must not expire and must have the paid
features on, so Change QR Code Link can be tested. The owner provides it:

1. Create a QRX user with the email `integration-testing@zapier.com` in the production Clerk dashboard (**Users →
   Create user**). If QRX's sign-in uses email codes, no password is needed: Zapier reads that inbox. If it uses
   passwords, set one Zapier support can change, and give it in the request.
2. Turn on the paid features for that user, with no end date and no trial limits (a complimentary paid plan).
3. Check it: with a key or token for that account, `GET https://qrx.codes/v1/account` answers
   `"changeDestination": true`.

Text for the request's test-account field:

> Sign in at https://qrx.codes as integration-testing@zapier.com (sign-in sends a code to that address). The account
> has the paid features on and does not expire. To test: Create QR Code with any prompt and an https link; the step
> finishes in about a minute and passes on the code's image file and short link. New QR Code fires for codes finished
> since the last poll. Find QR Code takes the id or short link from either. Change QR Code Link changes where a code
> sends people, on a paid plan (this account has it). Codes can also be seen at https://qrx.codes/my-codes.

## After submitting

1. Zapier replies in about a week. Fix anything the review raises and push a new version.
2. When approved, the integration is in **beta** for **90 days**.
3. After 90 days it becomes **public** automatically.

During beta, Zapier suggests a help article on qrx.codes, Zap templates, and an embed on the site; one sign-up from a
Zapier embed on the site ends the beta early (the next business day).
