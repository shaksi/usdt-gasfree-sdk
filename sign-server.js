require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const TronWeb = require("tronweb");
const requestIp = require("request-ip");

const app = express();
app.use(bodyParser.json());
app.use(requestIp.mw());

const PRIVATE_KEY = process.env.GASFREE_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Missing GASFREE_PRIVATE_KEY in .env file");
  process.exit(1);
}

const ALLOWED_IPS = ["::1", "127.0.0.1", "::ffff:127.0.0.1"];

const chainMap = {
  mainnet: {
    chainId: 728126428,
    contract: "TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U",
    host: "https://api.trongrid.io",
  },
  testnet: {
    chainId: 3448148188,
    contract: "THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc",
    host: "https://api.nileex.io",
  },
};

function validateMessage(message) {
  const fields = [
    "token", "serviceProvider", "user", "receiver", "value",
    "maxFee", "deadline", "version", "nonce"
  ];
  for (const field of fields) {
    if (!message.hasOwnProperty(field)) return `Missing required field: ${field}`;
    if (typeof message[field] !== "string") return `Field '${field}' must be a string`;
  }
  return null;
}

app.use((req, res, next) => {
  const clientIp = req.clientIp;
  if (!ALLOWED_IPS.includes(clientIp)) {
    console.warn(`Blocked request from IP: ${clientIp}`);
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

app.post("/sign", async (req, res) => {
  const { message, network = process.env.GASFREE_NETWORK || "mainnet", contract, chainId } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  const validationError = validateMessage(message);
  if (validationError) return res.status(400).json({ error: validationError });

  const config = chainMap[network] || chainMap.mainnet;

  const domain = {
    name: "GasFreeController",
    version: "V1.0.0",
    chainId: chainId || config.chainId,
    verifyingContract: contract || config.contract,
  };

  const types = {
    PermitTransfer: [
      { name: "token", type: "address" },
      { name: "serviceProvider", type: "address" },
      { name: "user", type: "address" },
      { name: "receiver", type: "address" },
      { name: "value", type: "uint256" },
      { name: "maxFee", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "version", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const tronWeb = new TronWeb({ fullHost: config.host, privateKey: PRIVATE_KEY });

  try {
    const derived = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
    if (derived !== message.user) {
      return res.status(400).json({
        error: "Private key does not match 'user' address.",
        expected: derived,
        received: message.user,
      });
    }

    const signature = await tronWeb.trx._signTypedData(domain, types, message, PRIVATE_KEY);
    const sig = signature.replace(/^0x/, "");

    if (sig.length !== 130) return res.status(500).json({ error: "Malformed signature" });

    return res.json({ signature: sig });
  } catch (e) {
    console.error("Signing error:", e);
    return res.status(500).json({ error: "Signing failed", details: e.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`GasFree Signing API running on http://localhost:${PORT}`);
});
