'use strict';

const { api } = require('../lib/config');
const { isLinkCode } = require('../lib/code');

// Fills the "QR Code" dropdown in Change QR Code Link: the account's link codes, newest first, a page at a time.
const perform = async (z, bundle) => {
  const params = { limit: 50 };
  if (bundle.meta && bundle.meta.page) {
    const cursor = await z.cursor.get();
    if (cursor) params.cursor = cursor;
  }
  const response = await z.request({ url: api('/codes'), params });
  const page = response.data;
  await z.cursor.set(page.hasMore && page.nextCursor ? page.nextCursor : '');
  return page.data.filter(isLinkCode).map((code) => ({
    id: code.id,
    label: code.destination ? `${code.prompt} → ${code.destination}` : code.prompt,
  }));
};

module.exports = {
  key: 'code_list',
  noun: 'QR Code',
  display: {
    label: 'List QR Codes',
    description: 'Lists QR codes for dropdowns.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform,
    sample: { id: 'k7m2qz', label: 'A lighthouse on a cliff at sunset → https://example.com/menu' },
    outputFields: [
      { key: 'id', label: 'Code ID' },
      { key: 'label', label: 'Label' },
    ],
  },
};
