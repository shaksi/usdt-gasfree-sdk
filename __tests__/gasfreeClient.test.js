const assert = require('node:assert/strict');
const test = require('node:test');
const { GasFreeClient } = require('../src/gasfreeClient');

const baseConfig = {
  network: 'testnet',
  apiKey: 'apiKey',
  apiSecret: 'apiSecret',
  address: 'TUVWXYZ1234567890',
  privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

function createClient() {
  const client = new GasFreeClient(baseConfig);
  client.http.request = async () => {
    throw new Error('request mock not implemented');
  };
  return client;
}

test('request includes status and response message when request fails with structured body', async () => {
  const client = createClient();
  client.http.request = async () => {
    const error = new Error('Request failed');
    error.response = { status: 400, data: { message: 'Invalid payload' } };
    throw error;
  };

  await assert.rejects(
    client.request('/api/test'),
    (error) => error.message === 'GasFree API request failed - status 400 - message: Invalid payload',
  );
});

test('request stringifies response body when message is absent', async () => {
  const client = createClient();
  client.http.request = async () => {
    const error = new Error('Request failed');
    error.response = { status: 500, data: { error: 'internal_error' } };
    throw error;
  };

  await assert.rejects(
    client.request('/api/test'),
    (error) =>
      error.message ===
      'GasFree API request failed - status 500 - message: {"error":"internal_error"}',
  );
});

test('request falls back to native error message when response is missing', async () => {
  const client = createClient();
  client.http.request = async () => {
    throw new Error('Network unreachable');
  };

  await assert.rejects(
    client.request('/api/test'),
    (error) => error.message === 'GasFree API request failed - message: Network unreachable',
  );
});

test('parseAmount converts numeric amount to scaled string', () => {
  const client = createClient();
  assert.equal(client.parseAmount(1.5), '1500000');
});

test('parseAmount converts string amount to scaled string', () => {
  const client = createClient();
  assert.equal(client.parseAmount('2.75'), '2750000');
});

test('parseAmount throws when amount is not positive', () => {
  const client = createClient();
  assert.throws(() => client.parseAmount(0), /Amount must be a positive number/);
  assert.throws(() => client.parseAmount(-1), /Amount must be a positive number/);
  assert.throws(() => client.parseAmount('not-a-number'), /Amount must be a positive number/);
});

test('buildTransferPayload throws when required data cannot be resolved', async () => {
  const client = createClient();
  client.getGasFreeAccountInfo = async () => ({ data: {} });
  client.getSupportedTokens = async () => [];
  client.getServiceProviders = async () => [];

  await assert.rejects(
    client.buildTransferPayload({ receiver: 'receiver', amount: 1 }),
    /Unable to prepare transfer payload: missing token, provider, or nonce\./,
  );
});

test('buildTransferPayload returns payload when dependencies resolve', async () => {
  const client = createClient();
  client.getGasFreeAccountInfo = async () => ({ data: { nonce: 1 } });
  client.getSupportedTokens = async () => [{ tokenAddress: 'token-address' }];
  client.getServiceProviders = async () => [{ address: 'provider-address' }];

  const payload = await client.buildTransferPayload({ receiver: 'receiver', amount: 1 });
  assert.deepEqual(
    payload,
    {
      token: 'token-address',
      serviceProvider: 'provider-address',
      user: baseConfig.address,
      receiver: 'receiver',
      value: '1000000',
      maxFee: client.defaultMaxFee(),
      deadline: payload.deadline,
      version: '1',
      nonce: '1',
    },
  );

  const now = Math.floor(Date.now() / 1000);
  assert.ok(Number.parseInt(payload.deadline, 10) >= now);
});

test('sendGasFreeTransfer supports dry run without signing or submission', async () => {
  const client = createClient();
  const payload = { mock: 'payload' };
  let signCalled = false;
  let submitCalled = false;

  client.buildTransferPayload = async () => payload;
  client.signPayload = async () => {
    signCalled = true;
    return 'signature';
  };
  client.submitTransferAuthorization = async () => {
    submitCalled = true;
    return { traceId: '123' };
  };

  const result = await client.sendGasFreeTransfer({ receiver: 'receiver', amount: 1, dryRun: true });

  assert.deepEqual(result, { status: true, dryRun: true, payload });
  assert.equal(signCalled, false);
  assert.equal(submitCalled, false);
});
