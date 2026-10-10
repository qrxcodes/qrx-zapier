'use strict';

const { api } = require('../lib/config');
const { isLinkCode, shapeCode, sample, outputFields } = require('../lib/code');

// Codes completed in the last hour: well past the slowest polling interval, and Zapier drops ids it has seen.
const LOOKBACK_MS = 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
// Stop following pages before Zapier's 30 s limit.
const TIME_BUDGET_MS = 20 * 1000;

const listFinished = (z, params) =>
  z.request({ url: api('/codes'), params: { status: 'succeeded', ...params } }).then((r) => r.data);

const perform = async (z, bundle) => {
  const started = Date.now();
  const codes = [];

  if (bundle.meta && bundle.meta.isLoadingSample) {
    // In the Zap editor, show the latest finished codes even if none finished in the last hour.
    const page = await listFinished(z, { limit: 10 });
    codes.push(...page.data);
  } else {
    const completedAfter = new Date(started - LOOKBACK_MS).toISOString();
    let cursor;
    for (let pages = 0; pages < MAX_PAGES; pages += 1) {
      const params = { completedAfter, limit: PAGE_SIZE };
      if (cursor) params.cursor = cursor;
      const page = await listFinished(z, params);
      codes.push(...page.data);
      cursor = page.nextCursor;
      if (!page.hasMore || !cursor || Date.now() - started > TIME_BUDGET_MS) break;
    }
  }

  const seen = new Set();
  return codes
    .filter((code) => code.status === 'succeeded' && isLinkCode(code))
    .filter((code) => (seen.has(code.id) ? false : seen.add(code.id)))
    .sort((a, b) => String(b.completedAt || b.createdAt).localeCompare(String(a.completedAt || a.createdAt)))
    .map((code) => shapeCode(z, code));
};

module.exports = {
  key: 'new_code',
  noun: 'QR Code',
  display: {
    label: 'New QR Code',
    description: 'Triggers when a QR code is finished and ready to use, with its image file and short link.',
  },
  operation: {
    type: 'polling',
    perform,
    inputFields: [],
    sample,
    outputFields,
  },
};
