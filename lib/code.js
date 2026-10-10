'use strict';

const hydrators = require('../hydrators');

const TERMINAL = new Set(['succeeded', 'failed']);

const isTerminal = (code) => Boolean(code) && TERMINAL.has(code.status);

// This integration makes and reports link codes only.
const isLinkCode = (code) => Boolean(code) && (code.type === undefined || code.type === 'url');

// Accepts an id ("k7m2qz"), a short link ("https://qrx.to/k7m2qz", "qrx.to/k7m2qz") or a code page URL
// ("https://qrx.codes/view/k7m2qz").
const parseCodeId = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(?:https?:\/\/)?[^/\s]+\/(?:view\/)?([A-Za-z0-9_-]{1,64})\/?(?:[?#].*)?$/);
  return match ? match[1] : text;
};

// The fields a Zap's later steps see. `image` is a file: Zapier downloads the PNG only when a later step uses it.
const shapeCode = (z, code) => ({
  id: code.id,
  status: code.status,
  prompt: code.prompt,
  style: code.style ?? null,
  destination: code.destination ?? null,
  shortUrl: code.shortUrl ?? null,
  pageUrl: code.pageUrl ?? null,
  imageUrl: code.imageUrl ?? null,
  image: code.imageUrl ? z.dehydrateFile(hydrators.downloadImage, { url: code.imageUrl, id: code.id }) : null,
  createdAt: code.createdAt ?? null,
  completedAt: code.completedAt ?? null,
});

const sample = {
  id: 'k7m2qz',
  status: 'succeeded',
  prompt: 'A lighthouse on a cliff at sunset',
  style: null,
  destination: 'https://example.com/menu',
  shortUrl: 'https://qrx.to/k7m2qz',
  pageUrl: 'https://qrx.codes/view/k7m2qz',
  imageUrl: 'https://qrx.codes/media/premium/k7m2qz.png',
  image: 'https://qrx.codes/media/premium/k7m2qz.png',
  createdAt: '2026-10-08T01:23:45.000Z',
  completedAt: '2026-10-08T01:24:31.000Z',
};

const outputFields = [
  { key: 'id', label: 'Code ID', type: 'string' },
  { key: 'status', label: 'Status', type: 'string' },
  { key: 'prompt', label: 'Picture Prompt', type: 'string' },
  { key: 'style', label: 'Style ID', type: 'string' },
  { key: 'destination', label: 'Link', type: 'string' },
  { key: 'shortUrl', label: 'Short Link (Encoded in the Code)', type: 'string' },
  { key: 'pageUrl', label: 'Code Page URL', type: 'string' },
  { key: 'imageUrl', label: 'Image URL', type: 'string' },
  { key: 'image', label: 'Image File (PNG)', type: 'file' },
  { key: 'createdAt', label: 'Created At', type: 'datetime' },
  { key: 'completedAt', label: 'Completed At', type: 'datetime' },
];

module.exports = { isTerminal, isLinkCode, parseCodeId, shapeCode, sample, outputFields };
