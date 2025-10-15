const crypto = require('node:crypto');
const TronWeb = require('tronweb');
const axios = require('axios');

const chainMap = {
  mainnet: {
    chainId: 728126428,
    contract: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U',
    host: 'https://api.trongrid.io',
  },
  testnet: {
    chainId: 3448148188,
    contract: 'THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc',
    host: 'https://api.nileex.io',
  },
};

class GasFreeClient {
  constructor({ network, apiKey, apiSecret, address, privateKey }) {
    this.network = network;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.address = address;
    this.privateKey = privateKey;
    this.http = axios.create({ timeout: 10_000 });
  }

  getBaseUrl() {
    return this.network === 'testnet'
      ? 'https://open-test.gasfree.io/nile'
      : 'https://open.gasfree.io/tron';
  }

  getChainConfig() {
    return chainMap[this.network] || chainMap.mainnet;
  }

  generateSignature(method, path, timestamp) {
    const payload = `${method}${path}${timestamp}`;
    return crypto.createHmac('sha256', this.apiSecret).update(payload).digest('base64');
  }

  async request(endpoint, method = 'GET', params = {}) {
    const url = new URL(endpoint, this.getBaseUrl());
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(method, url.pathname, timestamp);

    const headers = {
      Timestamp: timestamp,
      Authorization: `ApiKey ${this.apiKey}:${signature}`,
      'Content-Type': 'application/json',
    };

    const config = {
      method,
      url: url.toString(),
      headers,
    };

    if (method === 'GET' && Object.keys(params).length > 0) {
      config.params = params;
    }

    if (method === 'POST') {
      config.data = params;
    }

    try {
      const { data } = await this.http.request(config);
      return data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`GasFree API request failed: ${message}`);
    }
  }

  async getSupportedTokens() {
    const data = await this.request('/api/v1/config/token/all');
    return data?.data?.tokens ?? [];
  }

  async getServiceProviders() {
    const data = await this.request('/api/v1/config/provider/all');
    return data?.data?.providers ?? [];
  }

  async getGasFreeAccountInfo(address) {
    return this.request(`/api/v1/address/${address}`);
  }

  async submitTransferAuthorization(payload) {
    return this.request('/api/v1/gasfree/submit', 'POST', payload);
  }

  async getAuthorizationStatus(traceId) {
    return this.request(`/api/v1/gasfree/${traceId}`);
  }

  async buildTransferPayload({ receiver, amount, maxFee, deadline }) {
    const accountInfo = await this.getGasFreeAccountInfo(this.address);
    const tokens = await this.getSupportedTokens();
    const providers = await this.getServiceProviders();

    const token = tokens[0]?.tokenAddress;
    const provider = providers[0]?.address;
    const nonce = accountInfo?.data?.nonce;

    if (!token || !provider || typeof nonce === 'undefined') {
      throw new Error('Unable to prepare transfer payload: missing token, provider, or nonce.');
    }

    const value = this.parseAmount(amount);
    const payload = {
      token,
      serviceProvider: provider,
      user: this.address,
      receiver,
      value,
      maxFee: maxFee ?? this.defaultMaxFee(),
      deadline: deadline ?? this.defaultDeadline(),
      version: '1',
      nonce: String(nonce),
    };

    return payload;
  }

  parseAmount(amount) {
    if (typeof amount === 'string') {
      amount = Number.parseFloat(amount);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number.');
    }
    const scaled = BigInt(Math.round(amount * 1_000_000));
    return scaled.toString();
  }

  defaultMaxFee() {
    const base = BigInt(1_000_000);
    const premium = BigInt(10_000_000);
    return (base + premium).toString();
  }

  defaultDeadline() {
    return String(Math.floor(Date.now() / 1000) + 180);
  }

  async signPayload(payload) {
    const { chainId, contract, host } = this.getChainConfig();
    const tronWeb = new TronWeb({ fullHost: host, privateKey: this.privateKey });

    const derived = tronWeb.address.fromPrivateKey(this.privateKey);
    if (derived !== payload.user) {
      throw new Error(`Configured private key does not match user address. Expected ${derived}, received ${payload.user}`);
    }

    const domain = {
      name: 'GasFreeController',
      version: 'V1.0.0',
      chainId,
      verifyingContract: contract,
    };

    const types = {
      PermitTransfer: [
        { name: 'token', type: 'address' },
        { name: 'serviceProvider', type: 'address' },
        { name: 'user', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'maxFee', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'version', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const signature = await tronWeb.trx._signTypedData(domain, types, payload, this.privateKey);
    const normalized = signature.replace(/^0x/, '');

    if (normalized.length !== 130) {
      throw new Error('Malformed signature returned by TronWeb.');
    }

    return normalized;
  }

  async sendGasFreeTransfer({ receiver, amount, maxFee, deadline, dryRun = false }) {
    if (!receiver) {
      throw new Error('Receiver address is required.');
    }

    const payload = await this.buildTransferPayload({ receiver, amount, maxFee, deadline });

    if (dryRun) {
      return {
        status: true,
        dryRun: true,
        payload,
      };
    }

    const signature = await this.signPayload(payload);
    const submission = await this.submitTransferAuthorization({ ...payload, sig: signature });

    return {
      status: true,
      payload,
      signature,
      submission,
    };
  }
}

module.exports = { GasFreeClient };
