# Changelog

## 1.0.1

- Update create/create_code: Test step makes a real code from the step's prompt, link and style, and counts against the QRX allowance. It waits up to 25 seconds and returns the finished code with its image, or the code still processing, with its short link and page, if it takes longer. Zap runs are unchanged.
- Update create/change_code_link: the step notes that testing it changes the code's link.

## 1.0.0

Initial release to public.

- New QR Code trigger: fires when a code is finished, with its image file and short link.
- Create QR Code action: makes a branded QR code from a picture prompt and a link, checked to scan before delivery.
- Change QR Code Link action: changes where an existing code sends people (on a paid plan).
- Find QR Code search: finds a code by its id or short link.
