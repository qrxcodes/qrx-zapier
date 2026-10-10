'use strict';

const { api } = require('../lib/config');
const { isLinkCode, parseCodeId, shapeCode, sample, outputFields } = require('../lib/code');

const perform = async (z, bundle) => {
  const id = parseCodeId(bundle.inputData.id);
  if (!id) return [];
  try {
    const response = await z.request({ url: api(`/codes/${encodeURIComponent(id)}`) });
    const code = response.data;
    return isLinkCode(code) ? [shapeCode(z, code)] : [];
  } catch (error) {
    if (error.qrxProblem === 'not-found') return [];
    throw error;
  }
};

module.exports = {
  key: 'find_code',
  noun: 'QR Code',
  display: {
    label: 'Find QR Code',
    description: 'Finds a QR code by its id or short link, with its status, link and image file.',
  },
  operation: {
    inputFields: [
      {
        key: 'id',
        label: 'Code ID or Short Link',
        required: true,
        type: 'string',
        dynamic: 'code_list.id.label',
        helpText:
          "The code's id (for example `k7m2qz`), its short link (`https://qrx.to/k7m2qz`) or its page URL on qrx.codes.",
      },
    ],
    perform,
    sample,
    outputFields,
  },
};
