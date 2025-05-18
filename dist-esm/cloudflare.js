import { validateAndMergeConfig } from './config';
import { CryptoUtils } from './utils/crypto';
import { LRUCache } from 'lru-cache';
export class PowCloudflare {
    constructor(config) {
        this.config = validateAndMergeConfig(config);
        // Initialize nonce cache
        this.nonceCache = new LRUCache({
            max: this.config.cacheSize || 10000,
            ttl: (this.config.timestampTolerance || 30) * 1000 // Convert to milliseconds
        });
    }
    /**
     * Handles an incoming request
     * @param request Incoming request
     * @returns Response or null if request should be passed to origin
     */
    async handleRequest(request) {
        const url = new URL(request.url);
        const endpoint = url.pathname;
        // Check if this endpoint is protected
        if (!this.isProtectedEndpoint(endpoint)) {
            // If not protected, pass through to origin
            return null;
        }
        // Extract PoW headers
        const timestamp = request.headers.get('X-Timestamp');
        const nonce = request.headers.get('X-Nonce');
        const context = request.headers.get('X-Context');
        const stamp = request.headers.get('X-Stamp');
        // Check if all required headers are present
        if (!timestamp || !nonce || !context || !stamp) {
            return new Response('Missing PoW headers', { status: 400 });
        }
        // Validate timestamp
        const now = Math.floor(Date.now() / 1000);
        const timestampNum = parseInt(timestamp, 10);
        const tolerance = this.config.timestampTolerance || 30;
        if (isNaN(timestampNum) || now - timestampNum > tolerance) {
            return new Response('Timestamp expired or invalid', { status: 403 });
        }
        // Check for nonce replay
        const nonceKey = `${timestamp}:${nonce}`;
        if (this.nonceCache.has(nonceKey)) {
            return new Response('Nonce already used', { status: 403 });
        }
        // Validate PoW stamp
        const dataToHash = `${endpoint}:${timestamp}:${nonce}:${context}`;
        const validStamp = CryptoUtils.sha256(dataToHash);
        if (validStamp !== stamp) {
            return new Response('Invalid PoW stamp', { status: 403 });
        }
        // Check difficulty
        const difficulty = this.config.difficulty || 4;
        if (!CryptoUtils.hasLeadingZeros(stamp, difficulty)) {
            return new Response('Insufficient PoW difficulty', { status: 403 });
        }
        // Record nonce to prevent replay
        this.nonceCache.set(nonceKey, true);
        // Apply rate limiting if enabled
        if (this.config.cloudflare?.rateLimiting) {
            const clientIp = request.headers.get('CF-Connecting-IP') || '';
            const limitExceeded = await this.checkRateLimit(clientIp);
            if (limitExceeded) {
                return new Response('Rate limit exceeded', { status: 429 });
            }
        }
        // Generate HMAC signature for origin validation
        const hmacData = `${timestamp}:${nonce}:${context}`;
        const hmacSignature = CryptoUtils.hmac(hmacData, this.config.secret || '', this.config.hmacAlgorithm);
        // Create a new request with the HMAC header
        const modifiedHeaders = new Headers(request.headers);
        modifiedHeaders.set('X-HMAC', hmacSignature);
        // Create and return a new request to be sent to the origin
        const modifiedRequest = new Request(request.url, {
            method: request.method,
            headers: modifiedHeaders,
            body: request.body,
            redirect: request.redirect
        });
        // Return null to indicate that the request should be passed to the origin
        // with the modified headers
        return null;
    }
    /**
     * Checks if an endpoint is in the protected list
     * @param endpoint Endpoint to check
     * @returns True if the endpoint is protected
     */
    isProtectedEndpoint(endpoint) {
        if (!this.config.endpoints || this.config.endpoints.length === 0) {
            return false;
        }
        return this.config.endpoints.some(protectedEndpoint => {
            // Exact match
            if (endpoint === protectedEndpoint) {
                return true;
            }
            // Wildcard match (e.g., /api/*)
            if (protectedEndpoint.endsWith('*')) {
                const prefix = protectedEndpoint.slice(0, -1);
                return endpoint.startsWith(prefix);
            }
            return false;
        });
    }
    /**
     * Checks if a client has exceeded their rate limit
     * @param clientIp Client IP address
     * @returns True if rate limit exceeded
     */
    async checkRateLimit(clientIp) {
        // Simple implementation using the LRU cache
        // In a production environment, you might want to use Cloudflare's Workers KV or Durable Objects
        const requestsPerMinute = this.config.cloudflare?.requestsPerMinute || 30;
        const rateKey = `rate:${clientIp}`;
        const currentCount = this.nonceCache.get(rateKey) || 0;
        if (currentCount >= requestsPerMinute) {
            return true; // Rate limit exceeded
        }
        // Increment count
        this.nonceCache.set(rateKey, (currentCount + 1), {
            ttl: 60 * 1000 // 1 minute TTL for rate limiting 
        });
        return false;
    }
}
