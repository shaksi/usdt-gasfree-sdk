<?php

namespace GasFree;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class GasFreeService
{
  protected $httpClient;
  protected $apiKey;
  protected $apiSecret;
  protected $accountAddress;
  protected $network;
  protected $signService;

  public function __construct(array $config)
  {
    $this->httpClient = new Client();

    $required = ['api_key', 'api_secret', 'address', 'sign_service', 'network'];
    foreach ($required as $key) {
      if (empty($config[$key])) {
        throw new \InvalidArgumentException("Missing required config key: {$key}");
      }
    }

    $this->apiKey = $config['api_key'];
    $this->apiSecret = $config['api_secret'];
    $this->accountAddress = $config['address'];
    $this->network = $config['network'];
    $this->signService = $config['sign_service'];
  }

  protected function log($level, $message, $context = [])
  {
    echo strtoupper($level) . ': ' . $message . ' ' . json_encode($context) . PHP_EOL;
  }

  protected function getUrl($network)
  {
    return $network === 'testnet'
      ? 'https://open-test.gasfree.io/nile'
      : 'https://open.gasfree.io/tron';
  }

  protected function generateSignature($method, $path, $timestamp, $secret)
  {
    $message = $method . $path . $timestamp;
    return base64_encode(hash_hmac('sha256', $message, $secret, true));
  }

  protected function request($endpoint, $method = 'GET', $params = [])
  {
    $baseUrl = $this->getUrl($this->network);
    $timestamp = time();
    $signature = $this->generateSignature(
      $method,
      parse_url($baseUrl . $endpoint, PHP_URL_PATH),
      $timestamp,
      $this->apiSecret
    );

    $headers = [
      'Timestamp' => $timestamp,
      'Authorization' => "ApiKey {$this->apiKey}:{$signature}",
      'Content-Type' => 'application/json',
    ];

    $options = ['headers' => $headers];

    if ($method === 'GET' && !empty($params)) {
      $endpoint .= '?' . http_build_query($params);
    }

    if ($method === 'POST') {
      $options['json'] = $params;
    }

    try {
      $response = $this->httpClient->request($method, $baseUrl . $endpoint, $options);
      return json_decode($response->getBody(), true);
    } catch (RequestException $e) {
      $this->log('error', 'Request failed', ['message' => $e->getMessage()]);
      return ['status' => false, 'message' => 'API request failed.'];
    }
  }

  public function getAddress()
  {
    return $this->accountAddress;
  }

  public function getSupportedTokens()
  {
    $data = $this->request('/api/v1/config/token/all');
    return $data['data']['tokens'] ?? [];
  }

  public function getServiceProviders()
  {
    $data = $this->request('/api/v1/config/provider/all');
    return $data['data']['providers'] ?? [];
  }

  public function getGasFreeAccountInfo($accountAddress)
  {
    return $this->request("/api/v1/address/{$accountAddress}");
  }

  public function submitTransferAuthorization(array $payload)
  {
    return $this->request('/api/v1/gasfree/submit', 'POST', $payload);
  }

  public function getAuthorizationStatus($traceId)
  {
    return $this->request("/api/v1/gasfree/{$traceId}");
  }

  public function sendGasFreeTransfer($receiver, $amount)
  {
    $account = $this->getAddress();
    $amount = $amount * 1_000_000;

    $tokens = $this->getSupportedTokens();
    $providers = $this->getServiceProviders();
    $accountInfo = $this->getGasFreeAccountInfo($account);

    $token = $tokens[0]['tokenAddress'] ?? null;
    $provider = $providers[0]['address'] ?? null;
    $nonce = $accountInfo['data']['nonce'] ?? null;

    if (!$token || !$provider || !$nonce) {
      throw new \RuntimeException('Missing required data to build payload.');
    }

    $payload = [
      'token' => $token,
      'serviceProvider' => $provider,
      'user' => $account,
      'receiver' => $receiver,
      'value' => (string) $amount,
      'maxFee' => (string)(1000000 + 10000000),
      'deadline' => (string) (time() + 180),
      'version' =>  "1",
      'nonce' => (string) $nonce,
    ];

    $response = $this->httpClient->post($this->signService, [
      'json' => [
        'message' => $payload,
        'network' => $this->network,
      ]
    ]);

    $sig = json_decode($response->getBody(), true)['signature'] ?? null;

    if (!$sig) {
      throw new \RuntimeException("Signature server failed to return a signature.");
    }

    $payload['sig'] = $sig;

    return $this->submitTransferAuthorization($payload);
  }
}