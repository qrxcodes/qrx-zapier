'use strict';

const crypto = require('crypto');

// The same callback URL always gives the same key, so a replay that reuses the URL gets the first code back instead
// of making (and counting) a second one.
const idempotencyKeyFor = (callbackUrl) =>
  `zapier-${crypto.createHash('sha256').update(String(callbackUrl)).digest('hex')}`;

module.exports = { idempotencyKeyFor };
