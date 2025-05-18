# PoW Shield Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Client-Side Usage](#client-side-usage)
5. [Cloudflare Worker Usage](#cloudflare-worker-usage)
6. [Origin Server Usage](#origin-server-usage)
7. [API Reference](#api-reference)
8. [Technical Details](#technical-details)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Introduction

PoW Shield is a comprehensive Proof-of-Work (PoW) protection system that secures your API endpoints without requiring user authentication. It works by making API requests computationally expensive, deterring abuse while allowing legitimate users to access your API.

The system operates across three environments:
- **Client-side**: Adds PoW headers to outgoing requests
- **Cloudflare Worker**: Validates PoW headers and adds HMAC
- **Origin Server**: Validates HMAC to ensure requests passed through Cloudflare

## Installation

Install PoW Shield in all three environments:

```bash
npm install pow-shield
```

## Configuration

PoW Shield uses environment variables for configuration across all environments:

```bash
# Required in all environments
export POW_ENDPOINTS='["/api/data", "/api/submit"]'
export POW_SECRET="your-shared-hmac-secret-key"

# Optional settings
export POW_DIFFICULTY="4"
export POW_TIMESTAMP_TOLERANCE="30"
export POW_CACHE_SIZE="10000"
```

## Client-Side Usage

```javascript
import { PowClient } from 'pow-shield';

// Initialize PoW Shield client
const powClient = new PowClient({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  difficulty: parseInt(process.env.POW_DIFFICULTY || '4')
});

// Use with fetch
async function fetchData() {
  const response = await powClient.fetch('/api/data');
  return response.json();
}

// Or get headers manually
async function manualRequest() {
  const headers = await powClient.getHeaders('/api/data');
  
  return fetch('/api/data', {
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  });
}
```

## Cloudflare Worker Usage

```javascript
import { PowCloudflare } from 'pow-shield';

// Initialize PoW Shield worker
const powWorker = new PowCloudflare({
  endpoints: JSON.parse(PROTECTED_ENDPOINTS), // From Cloudflare env
  secret: POW_SECRET, // From Cloudflare env
  difficulty: parseInt(POW_DIFFICULTY || '4'),
  cacheType: 'memory'
});

// Handle requests
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const workerResponse = await powWorker.handleRequest(request);
  
  if (workerResponse) {
    return workerResponse; // PoW validation failed
  }
  
  return fetch(request); // Pass to origin
}
```

## Origin Server Usage

### Express

```javascript
const express = require('express');
const { PowServer } = require('pow-shield');

const app = express();

// Initialize PoW Shield server
const powServer = new PowServer({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  secret: process.env.POW_SECRET
});

// Apply middleware
app.use(powServer.expressMiddleware());

// Your routes
app.get('/api/data', (req, res) => {
  res.json({ message: 'Protected data' });
});

app.listen(3000);
```

### Fastify

```javascript
const fastify = require('fastify')();
const { PowServer } = require('pow-shield');

// Initialize PoW Shield server
const powServer = new PowServer({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  secret: process.env.POW_SECRET,
  server: { framework: 'fastify' }
});

// Register plugin
fastify.register(powServer.fastifyPlugin());

// Your routes
fastify.get('/api/data', async (request, reply) => {
  return { message: 'Protected data' };
});

fastify.listen({ port: 3000 });
```

### Koa

```javascript
const Koa = require('koa');
const { PowServer } = require('pow-shield');

const app = new Koa();

// Initialize PoW Shield server
const powServer = new PowServer({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  secret: process.env.POW_SECRET,
  server: { framework: 'koa' }
});

// Apply middleware
app.use(powServer.koaMiddleware());

// Your routes
app.use(async ctx => {
  if (ctx.path === '/api/data') {
    ctx.body = { message: 'Protected data' };
  }
});

app.listen(3000);
```

## API Reference

### Client-Side API

#### `new PowClient(config)`
Creates a PoW Shield client instance.

**Parameters**:
- `config` (Partial<PowShieldConfig>): Configuration options

**Returns**: `PowClient`

#### `powClient.fetch(url, options)`
Makes a fetch request with PoW headers.

**Parameters**:
- `url` (string): URL to fetch
- `options` (RequestInit): Fetch options

**Returns**: `Promise<Response>`

#### `powClient.getHeaders(endpoint)`
Gets PoW headers for a request.

**Parameters**:
- `endpoint` (string): API endpoint

**Returns**: `Promise<Record<string, string>>`

### Cloudflare Worker API

#### `new PowCloudflare(config)`
Creates a PoW Shield Cloudflare Worker instance.

**Parameters**:
- `config` (Partial<PowShieldConfig>): Configuration options

**Returns**: `PowCloudflare`

#### `powWorker.handleRequest(request)`
Handles an incoming request.

**Parameters**:
- `request` (Request): Incoming request

**Returns**: `Promise<Response | null>`

### Origin Server API

#### `new PowServer(config)`
Creates a PoW Shield server instance.

**Parameters**:
- `config` (Partial<PowShieldConfig>): Configuration options

**Returns**: `PowServer`

#### `powServer.expressMiddleware()`
Creates middleware for Express.

**Returns**: Express middleware function

#### `powServer.fastifyPlugin()`
Creates plugin for Fastify.

**Returns**: Fastify plugin

#### `powServer.koaMiddleware()`
Creates middleware for Koa.

**Returns**: Koa middleware function

## Technical Details

### Proof-of-Work Algorithm

1. Client generates a random nonce
2. Client computes `hash = SHA256(endpoint + timestamp + nonce + context)`
3. Client checks if hash has N leading zero bits (difficulty)
4. If not, client tries a new nonce and repeats

### Headers

The following headers are used:

- `X-Timestamp`: Current timestamp (seconds since epoch)
- `X-Nonce`: Random nonce used for PoW
- `X-Context`: Context hash (from user agent)
- `X-Stamp`: PoW hash with leading zeros
- `X-HMAC`: HMAC signature added by Cloudflare

### Security Flow

1. Client computes PoW and sends request to Cloudflare
2. Cloudflare validates PoW and adds HMAC
3. Origin server validates HMAC
4. Only legitimate requests with valid HMAC reach origin

## Security Considerations

- Use a strong, unique secret key for HMAC generation
- Set an appropriate difficulty level (4-8 bits)
- Keep the secret key consistent across Cloudflare and origin
- Regularly rotate the secret key
- Consider using a higher difficulty for more sensitive endpoints

## Troubleshooting

### Client-side Issues

- **Slow PoW Generation**: Increase worker threads or decrease difficulty
- **Failed API Calls**: Check if endpoints match exactly between environments

### Cloudflare Issues

- **High CPU Usage**: Adjust difficulty or cache size
- **Memory Errors**: Lower cache size or switch to Durable Objects

### Origin Server Issues

- **Rejected Requests**: Check if secret keys match between Cloudflare and origin
- **HMAC Validation Failures**: Ensure proper header forwarding in Cloudflare