# Triggers, actions and searches

As defined in the code (`triggers/`, `creates/`, `searches/`). The noun is **QR Code** throughout. Each operation has a
sample, which Zapier shows when a Zap is set up and the user has no data yet. Testing a step in the editor uses real
data: New QR Code and Find QR Code read the account's codes, Create QR Code makes a code and Change QR Code Link
changes a code's link.

The `(note)` rows are `copy` fields: text shown in the step, with no value.

The two hidden triggers, `style_list` and `code_list`, only fill dropdowns and are not listed.

## Trigger: New QR Code (`new_code`)

| Field | Value |
|---|---|
| Noun | QR Code |
| Label | New QR Code |
| Description | Triggers when a QR code is finished and ready to use, with its image file and short link. |
| Type | Polling |
| Input fields | None |

## Action: Create QR Code (`create_code`)

| Field | Value |
|---|---|
| Noun | QR Code |
| Label | Create QR Code |
| Description | Creates a branded QR code from a picture prompt and a link. Each code is checked to scan before it is delivered. Testing this step makes a real code. |

| Input | Label | Required | Help text |
|---|---|---|---|
| `test_note` | (note) | No | **Test step makes a real code** from these fields, and it counts against your QRX allowance like any other code. The test waits up to 25 seconds: if the code is not finished by then, it shows as `processing` with its short link and page but no image yet, and the image fills in on its page. When the Zap runs, this step waits for the finished code and its image. |
| `prompt` | Picture Prompt | Yes | What the picture should show, in a sentence. For example: "A lighthouse on a cliff at sunset". Up to 1,000 characters. |
| `destination` | Link | Yes | Where scans go: a full web address starting with `https://` or `http://`. The code encodes a short qrx.to link that sends people here. |
| `style` | Style | No | A picture style. Leave empty to let the prompt decide. (Dropdown of QRX's styles.) |

In a Zap run, the step waits for the code to finish (about a minute) and then passes the finished code on.

The editor's **Test step** makes a real code from the fields above, which counts against the account's allowance. It
waits up to 25 seconds: a code that finishes in time comes back finished, with its image file; otherwise it comes back
with `status` `processing`, its real id, short link and page URL, and empty `imageUrl`, `image` and `completedAt`.

## Action: Change QR Code Link (`change_code_link`)

| Field | Value |
|---|---|
| Noun | QR Code |
| Label | Change QR Code Link |
| Description | Changes where an existing QR code sends people, on a paid plan. Printed codes follow the new link at once. Testing this step changes the link too. |

| Input | Label | Required | Help text |
|---|---|---|---|
| `test_note` | (note) | No | **Test step changes the code's link for real**, on a paid plan: printed codes follow the new link at once. Test with a code you are happy to point at the new link. |
| `id` | QR Code | Yes | The code whose link to change, on a paid plan. Pick one, or map a code id or short link from an earlier step. (Dropdown of the account's codes; can also use Find QR Code.) |
| `destination` | New Link | Yes | Where scans go from now on: a full web address starting with `https://` or `http://`. Changing a code's link is on a paid plan. |

On an account without the feature, the step stops with: "Changing a code's link is on a paid plan. See
https://qrx.codes for plans."

## Search: Find QR Code (`find_code`)

| Field | Value |
|---|---|
| Noun | QR Code |
| Label | Find QR Code |
| Description | Finds a QR code by its id or short link, with its status, link and image file. |

| Input | Label | Required | Help text |
|---|---|---|---|
| `id` | Code ID or Short Link | Yes | The code's id (for example `k7m2qz`), its short link (`https://qrx.to/k7m2qz`) or its page URL on qrx.codes. |

## Output fields (all four)

| Key | Label |
|---|---|
| `id` | Code ID |
| `status` | Status |
| `prompt` | Picture Prompt |
| `style` | Style ID |
| `destination` | Link |
| `shortUrl` | Short Link (Encoded in the Code) |
| `pageUrl` | Code Page URL |
| `imageUrl` | Image URL |
| `image` | Image File (PNG) |
| `createdAt` | Created At |
| `completedAt` | Completed At |

## Sample data

Create QR Code, Find QR Code and New QR Code:

```json
{
  "id": "k7m2qz",
  "status": "succeeded",
  "prompt": "A lighthouse on a cliff at sunset",
  "style": null,
  "destination": "https://example.com/menu",
  "shortUrl": "https://qrx.to/k7m2qz",
  "pageUrl": "https://qrx.codes/view/k7m2qz",
  "imageUrl": "https://qrx.codes/media/premium/k7m2qz.png",
  "image": "https://qrx.codes/media/premium/k7m2qz.png",
  "createdAt": "2026-10-08T01:23:45.000Z",
  "completedAt": "2026-10-08T01:24:31.000Z"
}
```

Change QR Code Link: the same, with `"destination": "https://example.com/new-menu"`.
