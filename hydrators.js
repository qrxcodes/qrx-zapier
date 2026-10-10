'use strict';

// Downloads a finished code's PNG when a later step in the Zap needs the file.
const downloadImage = async (z, bundle) => {
  const { url, id } = bundle.inputData;
  const response = await z.request({ url, raw: true });
  return z.stashFile(response, undefined, `qrx-${id || 'code'}.png`, 'image/png');
};

module.exports = { downloadImage };
