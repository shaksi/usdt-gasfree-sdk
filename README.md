# USDT GasFree on Tron - PHP Client with Local Signing Server

This project provides a standalone PHP client to perform TRC-20 gasless transfers via the GasFree API: https://open.gasfree.io. It includes:

- A PHP client
- A secure Node.js signing server to protect your private key
- Environment-based config with multi-network support testnet & mainnet
- CLI utility for transfers

---

## 📦 Requirements

- PHP 7.4+
- Composer
- Node.js 16+
- NPM

---

## 1. Installation

1. Clone or unzip this repo

```bash
git clone git@github.com:shaksi/usdt-gasfree-sdk.git
cd usdt-gasfree-sdk
```

2. Install PHP dependencies

```bash
composer install
```

3. Install Node.js dependencies

```bash
npm install
```

4. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

5. Ensure the signing server is running see next step.

---

## 2. .env Configuration

If you dont have gassfree credentials, you can request them from here: https://docs.google.com/forms/d/e/1FAIpQLSc5EB1X8JN7LA4SAVAG99VziXEY6Kv6JxmlBry9rUBlwI-GaQ/viewform (it took 3wks to get access response)

The documentation can also be found here: https://gasfree.io/docs/GasFree_specification.html

---

## 3. Project Structure

```txt
gasfree-client/
├── src/
│   └── GasFreeService.php         # PHP SDK client
├── sign-server.js                 # Local signing server
├── run.php                        # CLI entry
├── .env                           # Your secrets (not committed)
├── composer.json
├── package.json
└── README.md                      # This file
```

---

## 4. Usage: CLI Transfer (run.php)

Use the CLI script to send gasless transfers:

```bash
php run.php –receiver=TXYZ… –amount=5 [–dry-run]
```

- `–receiver` — TRON address to send to
- `–amount` — Amount in USDT
- `–dry-run` — Simulate without sending

Examples

```bash
# Dry run
php run.php –receiver=TXYZ123… –amount=1 –dry-run

# Live transfer
php run.php –receiver=TXYZ123… –amount=1
```

---

## ✅ Next Steps

- Add transaction status checker
- Dockerize client & signer and turn into API

---

## 👨‍💻 Author

Built by [@Shaksi]https://github.com/Shaksi
