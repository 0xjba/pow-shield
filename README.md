## Cloudflare Worker Setup

The Cloudflare Worker component is the most critical part of the security chain, as it validates PoW from clients and adds trusted HMAC signatures for your origin server.

You have two options to set up the Cloudflare Worker:

### Option 1: One-Command Deployment (Recommended)

Use our CLI tool to deploy the universal Worker script:

```bash
# Install Wrangler CLI if you haven't already
npm install -g wrangler
wrangler login

# Deploy using our CLI tool
npx pow-shield-deploy --endpoints=/api/data,/api/submit --difficulty=4
```

The tool will:
1. Create a Worker script with the correct configuration
2. Securely prompt for your HMAC secret
3. Deploy to your Cloudflare account

**Additional Options:**
```
Usage: pow-shield-deploy [options]

Options:
  -V, --version              output the version number
  -e, --endpoints <endpoints>  Comma-separated list of protected API endpoints (required)
  -d, --difficulty <difficulty>  PoW difficulty level (default: "4")
  -t, --tolerance <seconds>  Timestamp tolerance in seconds (default: "30")
  -c, --cache-size <size>    Size of nonce cache (default: "10000")
  -r, --rate-limit <enabled>  Enable rate limiting (default: "true")
  -l, --limit <requests>     Requests per minute per IP (default: "30")
  -n, --name <n>             Worker name (default: "pow-shield-worker")
  -o, --output <directory>   Output directory (default: ".pow-shield-worker")
  -s, --secret <secret>      HMAC secret (not recommended, use prompts instead)
  --no-deploy                Generate files without deploying
  --route <pattern>          Add a route pattern (e.g., example.com/api/*)
  --zone <n>                 Zone name for the route
  -h, --help                 display help for command
```

### Option 2: Manual Deployment

If you prefer manual setup:

1. Copy our universal Worker script from `node_modules/pow-shield/examples/cloudflare-worker-universal.js`

2. Configure your `wrangler.toml`:
   ```toml
   name = "pow-shield-worker"
   main = "worker.js"
   compatibility_date = "2025-05-01"

   [vars]
   PROTECTED_ENDPOINTS = "[\"\/api\/data\", \"\/api\/submit\"]"
   POW_DIFFICULTY = "4"
   POW_TIMESTAMP_TOLERANCE = "30"
   POW_CACHE_SIZE = "10000"
   ```

3. Set your secret key:
   ```bash
   wrangler secret put POW_SECRET
   ```

4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

5. Set up routes in your Cloudflare dashboard to your protected endpoints# PoW Shield

A Proof-of-Work (PoW) protection system for securing API endpoints without requiring authentication.

## Overview

PoW Shield is a complete protection system that works across three environments:

1. **Client-side**: Generates PoW stamps before making requests
2. **Cloudflare Worker**: Validates PoW stamps and adds HMAC signatures
3. **Origin Backend**: Validates HMAC signatures to ensure requests come through Cloudflare

This approach allows you to keep your API endpoints public while making them expensive to abuse.

## Installation

Install the package in all three environments:

```bash
npm install pow-shield
```

## Configuration

PoW Shield uses environment variables for configuration:

```
# Required in all environments
POW_ENDPOINTS='["/api/data","/api/submit"]'
POW_SECRET='your-shared-hmac-secret-key'

# Optional settings
POW_DIFFICULTY='4'
POW_TIMESTAMP_TOLERANCE='30'
```

## Usage

### Client-side

```javascript
import { PowClient } from 'pow-shield';

// Initialize the PoW Shield client
const powClient = new PowClient({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  difficulty: parseInt(process.env.POW_DIFFICULTY || '4')
});

// Use with fetch
async function fetchData() {
  const response = await powClient.fetch('/api/data');
  return response.json();
}
```

### Cloudflare Worker

```javascript
import { PowCloudflare } from 'pow-shield';

// Initialize the PoW Shield worker
const powWorker = new PowCloudflare({
  endpoints: JSON.parse(PROTECTED_ENDPOINTS), // Cloudflare env var
  secret: POW_SECRET, // Cloudflare env var
  difficulty: parseInt(POW_DIFFICULTY || '4')
});

// Handle requests
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Check if this is a protected request
  const workerResponse = await powWorker.handleRequest(request);
  
  // If a response is returned, it means there was an error
  if (workerResponse) {
    return workerResponse;
  }
  
  // Otherwise, fetch from origin with the HMAC header
  return fetch(request);
}
```

### Origin Backend (Express)

```javascript
const express = require('express');
const { PowServer } = require('pow-shield');

const app = express();

// Initialize the PoW Shield server
const powServer = new PowServer({
  endpoints: JSON.parse(process.env.POW_ENDPOINTS || '[]'),
  secret: process.env.POW_SECRET
});

// Apply middleware to protected routes
app.use(powServer.expressMiddleware());

// Your routes
app.get('/api/data', (req, res) => {
  res.json({ message: 'Protected data' });
});

app.listen(3000);
```

## How It Works

1. **Client**: Computes a hash of `endpoint + timestamp + nonce + context` with leading zeros
2. **Cloudflare**: Validates the PoW stamp and adds an HMAC signature
3. **Origin**: Validates the HMAC signature to ensure the request came through Cloudflare

This creates a chain of trust where only validated requests can reach your origin server.

## Security Benefits

- No authentication required
- Prevents abuse by making requests computationally expensive
- Distributed cost (computation happens on client devices)
- Protection against DDoS attacks
- No exposure of origin server to direct access

## License

MIT