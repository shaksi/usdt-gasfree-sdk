const express = require('express');
const { loadConfig, getPort } = require('./config');
const { GasFreeClient } = require('./gasfreeClient');

function createServer() {
  const config = loadConfig();
  const client = new GasFreeClient(config);
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', network: config.network, address: config.address });
  });

  app.get('/api/tokens', async (req, res, next) => {
    try {
      const tokens = await client.getSupportedTokens();
      res.json({ status: true, tokens });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/providers', async (req, res, next) => {
    try {
      const providers = await client.getServiceProviders();
      res.json({ status: true, providers });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/account/:address?', async (req, res, next) => {
    try {
      const address = req.params.address || config.address;
      const account = await client.getGasFreeAccountInfo(address);
      res.json({ status: true, account });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/transfer/:traceId', async (req, res, next) => {
    try {
      const { traceId } = req.params;
      const status = await client.getAuthorizationStatus(traceId);
      res.json({ status: true, data: status });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/transfer', async (req, res, next) => {
    const { receiver, amount, maxFee, deadline, dryRun = false } = req.body;

    if (typeof amount === 'undefined') {
      return res.status(400).json({ status: false, error: 'Amount is required.' });
    }

    try {
      const result = await client.sendGasFreeTransfer({ receiver, amount, maxFee, deadline, dryRun });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, req, res, next) => {
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: false,
      error: error.message,
    });
  });

  const port = getPort();
  return { app, port };
}

if (require.main === module) {
  try {
    const { app, port } = createServer();
    app.listen(port, () => {
      console.log(`GasFree Node API listening on http://127.0.0.1:${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { createServer };
