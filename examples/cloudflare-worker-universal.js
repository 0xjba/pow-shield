// Universal Cloudflare Worker for PoW Shield
// Just deploy this script and configure environment variables
import { PowCloudflare } from 'pow-shield';

// Initialize with environment variables
const powWorker = new PowCloudflare({
  endpoints: JSON.parse(PROTECTED_ENDPOINTS || '[]'),
  secret: POW_SECRET || '',
  difficulty: parseInt(POW_DIFFICULTY || '4'),
  timestampTolerance: parseInt(POW_TIMESTAMP_TOLERANCE || '30'),
  cacheType: 'memory',
  cacheSize: parseInt(POW_CACHE_SIZE || '10000'),
  cloudflare: {
    rateLimiting: RATE_LIMITING !== 'false',
    requestsPerMinute: parseInt(REQUESTS_PER_MINUTE || '30')
  }
});

export default {
  async fetch(request, env, ctx) {
    // Check if the request needs PoW validation
    const powResponse = await powWorker.handleRequest(request);
    
    // If powResponse is not null, validation failed - return the error
    if (powResponse) {
      return powResponse;
    }
    
    // Validation succeeded, pass the request to origin
    // The request now includes the X-HMAC header
    return fetch(request);
  }
};