<?php

require __DIR__ . '/vendor/autoload.php';

use GasFree\GasFreeService;
use Dotenv\Dotenv;

// Load .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$options = getopt('', ['receiver:', 'amount:', 'dry-run']);
if (!isset($options['receiver']) || !isset($options['amount'])) {
  echo "Usage: php run.php --receiver=TABC123 --amount=5 [--dry-run]" . PHP_EOL;
  exit(1);
}

$network = $_ENV['GASFREE_NETWORK'] ?? 'testnet';

$config = [
  'network'      => $network,
  'address'      => $_ENV['GASFREE_ADDRESS'],
  'sign_service' => $_ENV['SIGN_SERVICE'],
  'api_key'      => $_ENV[strtoupper("gasfree_{$network}_api_key")],
  'api_secret'   => $_ENV[strtoupper("gasfree_{$network}_api_secret")],
];

$receiver = $options['receiver'];
$amount = (float) $options['amount'];
$dryRun = isset($options['dry-run']);

try {
  $client = new GasFreeService($config);

  if ($dryRun) {
    echo "🧪 DRY-RUN: Would send {$amount} USDT to {$receiver}" . PHP_EOL;
    exit(0);
  }

  echo "🚀 Sending {$amount} USDT to {$receiver}..." . PHP_EOL;
  $result = $client->sendGasFreeTransfer($receiver, $amount);

  echo "✅ Result:" . PHP_EOL;
  print_r($result);
} catch (\Exception $e) {
  echo "❌ Error: " . $e->getMessage() . PHP_EOL;
}