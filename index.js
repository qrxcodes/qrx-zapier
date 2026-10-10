'use strict';

const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');

const authentication = require('./authentication');
const hydrators = require('./hydrators');
const { addBearerHeader, handleProblems } = require('./lib/http');

const newCode = require('./triggers/new_code');
const codeList = require('./triggers/code_list');
const styleList = require('./triggers/style_list');
const findCode = require('./searches/find_code');
const createCode = require('./creates/create_code');
const changeCodeLink = require('./creates/change_code_link');

module.exports = {
  version,
  platformVersion,

  flags: { cleanInputData: false },

  authentication,
  beforeRequest: [addBearerHeader],
  afterResponse: [handleProblems],
  hydrators,

  triggers: {
    [newCode.key]: newCode,
    [codeList.key]: codeList,
    [styleList.key]: styleList,
  },
  searches: {
    [findCode.key]: findCode,
  },
  creates: {
    [createCode.key]: createCode,
    [changeCodeLink.key]: changeCodeLink,
  },
  searchOrCreates: {},
};
