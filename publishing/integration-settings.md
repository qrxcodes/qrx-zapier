# Integration settings

Field by field for the Zapier Developer Platform (**Integration settings** page, and the matching
`zapier-platform register` flags).

| Field | Value | Notes |
|---|---|---|
| Name (title) | `QRX` | Branding rule: the core brand only, no "app", ™ or domain. |
| Description | `QRX is a QR code maker that turns a picture prompt and a link into a branded, print-ready code, checked to scan before delivery.` | 128 characters. The CLI allows 140 and the branding guide 160. Starts "QRX is a", no links, no hype. |
| Homepage URL | `https://qrx.codes` | The marketing site, not a sign-in page. |
| Logo | [`logo-512.png`](logo-512.png) | 512 × 512 PNG, the scannable QRX code. Zapier needs at least 256 × 256; its branding guide asks for 512. |
| Category | `Images & Design` (`--category images`) | One category. |
| Intended audience | `Public` (`--audience global`) | It is built to be listed in the App Directory. |
| Role | `Employee` (`--role employee`) | The person registering works for QRX (MakerX). |
| Admin team member | an address on `@qrx.codes` | Integration check M005 needs an admin on the app's own domain. |
| API documentation | `https://qrx.codes/developers/docs` | OpenAPI: `https://qrx.codes/v1/openapi.json`. |
| Support URL | `https://qrx.codes/support` | |
| Support email | `hello@qrx.codes` | Same contact as the OpenAPI document. |
| Privacy policy URL | `https://qrx.codes/privacy` | |
| Terms of service URL | `https://qrx.codes/terms` | |

## Who it is for

People who put QR codes on things they print or share (menus, posters, packaging, event signage, flyers, slides) and
already keep their work in other tools. Typical Zaps:

- A new row in Google Sheets or a new Airtable record makes a code for that row's link, and the image goes to Google
  Drive or Dropbox.
- A new product in Shopify gets a code for its page, attached to a Slack message for the design team.
- A finished code (New QR Code) is emailed to the person who asked for it, or added to a Notion page.
- A campaign's landing page moves, and Change QR Code Link points the printed code at the new page (on a paid plan).

## Register command

The same values on the command line (the owner runs this once, signed in as the `@qrx.codes` account):

```sh
npx zapier-platform register "QRX" \
  --desc "QRX is a QR code maker that turns a picture prompt and a link into a branded, print-ready code, checked to scan before delivery." \
  --url "https://qrx.codes" \
  --audience global \
  --role employee \
  --category images
```

The logo, support and legal URLs are set on the Integration settings page afterwards.
