'use strict';

const candidateModules = ['@gasfree/sdk', 'gasfree-sdk-js'];

function resolveSdk() {
  for (const name of candidateModules) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const mod = require(name);
      const GasFreeSDK = mod?.GasFreeSDK || mod?.GasFreeClient || mod?.default;
      if (typeof GasFreeSDK === 'function') {
        return GasFreeSDK;
      }
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  const { GasFreeSDK } = require('./sdk/fallback');
  return GasFreeSDK;
}

const GasFreeSDK = resolveSdk();

module.exports = {
  GasFreeClient: GasFreeSDK,
  GasFreeSDK,
};

