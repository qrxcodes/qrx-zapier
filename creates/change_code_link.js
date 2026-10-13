'use strict';

const { api } = require('../lib/config');
const { parseCodeId, shapeCode, sample, outputFields } = require('../lib/code');

const perform = async (z, bundle) => {
  const id = parseCodeId(bundle.inputData.id);
  const response = await z.request({
    method: 'PATCH',
    url: api(`/codes/${encodeURIComponent(id)}`),
    headers: { 'Content-Type': 'application/json' },
    body: { destination: bundle.inputData.destination },
  });
  return shapeCode(z, response.data);
};

module.exports = {
  key: 'change_code_link',
  noun: 'QR Code',
  display: {
    label: 'Change QR Code Link',
    description:
      'Changes where an existing QR code sends people, on a paid plan. Printed codes follow the new link at once. Testing this step changes the link too.',
  },
  operation: {
    inputFields: [
      {
        key: 'test_note',
        type: 'copy',
        helpText:
          "**Test step changes the code's link for real**, on a paid plan: printed codes follow the new link at once. Test with a code you are happy to point at the new link.",
      },
      {
        key: 'id',
        label: 'QR Code',
        required: true,
        dynamic: 'code_list.id.label',
        search: 'find_code.id',
        helpText:
          'The code whose link to change, on a paid plan. Pick one, or map a code id or short link from an earlier step.',
      },
      {
        key: 'destination',
        label: 'New Link',
        required: true,
        type: 'string',
        helpText:
          "Where scans go from now on: a full web address starting with `https://` or `http://`. Changing a code's link is on a paid plan.",
      },
    ],
    perform,
    sample: { ...sample, destination: 'https://example.com/new-menu' },
    outputFields,
  },
};
