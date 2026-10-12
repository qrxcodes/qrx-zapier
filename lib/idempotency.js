'use strict';

const crypto = require('crypto');

// The same callback URL always gives the same key, so repeated sends within one step run get the first code back
// instead of making (and counting) a second one. Zapier issues a new callback URL when a run is replayed, so a replay
// makes a new code.
const idempotencyKeyFor = (callbackUrl) =>
  `zapier-${crypto.createHash('sha256').update(String(callbackUrl)).digest('hex')}`;

module.exports = { idempotencyKeyFor };
