# USDT GasFree on Tron - Node.js API

This project exposes a lightweight Node.js REST API that wraps the [GasFree](https://gasfree.io/) endpoints for TRC-20 gasless transfers. It borrows ideas from the official [gasfree-sdk-js](https://github.com/gasfreeio/gasfree-sdk-js) package but keeps everything in a single Express server, including local signing with your private key.

## ✨ Features

- Express API with JSON responses
- Fetches GasFree configuration (supported tokens, service providers)
- Retrieves account information and transfer status
- Creates and signs gasless transfer payloads locally via TronWeb
- Supports dry-run payload previews before broadcasting

## 🧰 Requirements

- Node.js 18+
- npm

## 🚀 Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your credentials:

   ```bash
   cp example.env .env
   # edit .env with your GasFree credentials and Tron private key
   ```

3. Start the API server:

   ```bash
   npm start
   ```

   The server listens on `http://127.0.0.1:4000` by default.

## 🔐 Environment Variables

| Variable | Description |
| --- | --- |
| `GASFREE_NETWORK` | Network to use: `testnet` or `mainnet`. |
| `GASFREE_TESTNET_API_KEY` / `GASFREE_TESTNET_API_SECRET` | GasFree API credentials for testnet. |
| `GASFREE_MAINNET_API_KEY` / `GASFREE_MAINNET_API_SECRET` | GasFree API credentials for mainnet. |
| `GASFREE_ADDRESS` | Tron address that owns the USDT balance. |
| `GASFREE_PRIVATE_KEY` | Private key corresponding to `GASFREE_ADDRESS`. It never leaves the server. |
| `PORT` | HTTP port for the Express server (defaults to `4000`). |

## 📡 API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Basic readiness probe. |
| `GET` | `/api/tokens` | List supported TRC-20 tokens. |
| `GET` | `/api/providers` | List GasFree service providers. |
| `GET` | `/api/account/:address?` | Fetch GasFree account metadata (defaults to the configured address). |
| `GET` | `/api/transfer/:traceId` | Retrieve the status for a submitted transfer trace ID. |
| `POST` | `/api/transfer` | Submit a new gasless transfer. Supports `{ dryRun: true }` to preview. |

### Example transfer request

```bash
curl -X POST http://127.0.0.1:4000/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "TXYZ...",
    "amount": 5,
    "dryRun": true
  }'
```

The response will contain the payload, and when `dryRun` is `false` it will also include the GasFree submission result.

## 🧪 Development Tips

- The signing flow validates that your configured private key belongs to `GASFREE_ADDRESS` before broadcasting.
- Use the dry-run flag to inspect the payload without sending it to GasFree.
- If you need additional endpoints, start from `src/server.js` and `src/gasfreeClient.js`.

## 📄 License

MIT
