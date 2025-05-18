// Cloudflare Worker example
import { PowCloudflare } from 'pow-shield';

// Initialize PoW Shield worker
const powWorker = new PowCloudflare({
  endpoints: ['/api/data', '/api/submit'],
  secret: SHIELD_SECRET, // From Cloudflare environment variable
  difficulty: 4,
  cacheType: 'memory',
  cacheSize: 10000
});

// Add event listener for fetch events
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Check if the request is for a protected endpoint
  const workerResponse = await powWorker.handleRequest(request);
  
  // If a response is returned, it means PoW validation failed
  if (workerResponse) {
    return workerResponse;
  }
  
  // Otherwise, fetch from origin with the added HMAC header
  return fetch(request);
}