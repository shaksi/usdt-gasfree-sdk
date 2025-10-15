const assert = require('node:assert');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_NETWORK = 'testnet';

function loadConfig() {
  const network = (process.env.GASFREE_NETWORK || DEFAULT_NETWORK).toLowerCase();
  const networkKey = network.toUpperCase();

  const apiKey = process.env[`GASFREE_${networkKey}_API_KEY`];
  const apiSecret = process.env[`GASFREE_${networkKey}_API_SECRET`];
  const address = process.env.GASFREE_ADDRESS;
  const privateKey = process.env.GASFREE_PRIVATE_KEY;

  try {
    assert(apiKey, `Missing GASFREE_${networkKey}_API_KEY`);
    assert(apiSecret, `Missing GASFREE_${networkKey}_API_SECRET`);
    assert(address, 'Missing GASFREE_ADDRESS');
    assert(privateKey, 'Missing GASFREE_PRIVATE_KEY');
  } catch (error) {
    error.message = `Configuration error: ${error.message}`;
    throw error;
  }

  return {
    network,
    apiKey,
    apiSecret,
    address,
    privateKey,
  };
}

function getPort() {
  const value = process.env.PORT || '4000';
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return port;
}

module.exports = {
  loadConfig,
  getPort,
};
