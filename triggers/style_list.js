'use strict';

const { api } = require('../lib/config');

// Fills the "Style" dropdown in Create QR Code.
const perform = async (z) => {
  const response = await z.request({ url: api('/styles') });
  return response.data.data.map((style) => ({ id: style.id, name: style.name, previewUrl: style.previewUrl }));
};

module.exports = {
  key: 'style_list',
  noun: 'Style',
  display: {
    label: 'List Styles',
    description: 'Lists picture styles for dropdowns.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    perform,
    sample: { id: 'a64c5', name: 'Anime', previewUrl: 'https://qrx.codes/images/styles/anime.png' },
    outputFields: [
      { key: 'id', label: 'Style ID' },
      { key: 'name', label: 'Name' },
      { key: 'previewUrl', label: 'Preview URL' },
    ],
  },
};
