import type { PowShieldConfig } from './config.js';
import { validateAndMergeConfig } from './config.js';
import { CryptoUtils } from './utils/crypto.js';

export class PowClient {
  private config: PowShieldConfig;

  constructor(config: Partial<PowShieldConfig>) {
    this.config = validateAndMergeConfig(config, 'client');
  }

  /**
   * Makes a fetch request with PoW headers
   * @param url URL to fetch
   * @param options Fetch options
   * @returns Fetch response
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Extract the endpoint path from the URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname;

    // Check if this endpoint is protected
    if (!this.isProtectedEndpoint(endpoint)) {
      // If not protected, make a regular fetch request
      return fetch(url, options);
    }

    // Generate PoW headers
    const powHeaders = await this.getHeaders(endpoint);
    
    // Merge with existing headers
    const mergedHeaders = {
      ...options.headers,
      ...powHeaders
    };

    // Make the fetch request with PoW headers
    return fetch(url, {
      ...options,
      headers: mergedHeaders
    });
  }

  /**
   * Gets PoW headers for a request
   * @param endpoint API endpoint
   * @returns Headers object with PoW headers
   */
  async getHeaders(endpoint: string): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const context = this.generateContext();
    
    // Generate a valid PoW stamp
    const { nonce, stamp } = await this.generateValidPow(endpoint, timestamp, context);
    
    return {
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Context': context,
      'X-Stamp': stamp
    };
  }

  /**
   * Generates a valid PoW stamp
   * @param endpoint API endpoint
   * @param timestamp Current timestamp
   * @param context Request context
   * @returns Valid nonce and stamp
   */
  private async generateValidPow(
    endpoint: string,
    timestamp: string,
    context: string
  ): Promise<{ nonce: string; stamp: string }> {
    const difficulty = this.config.difficulty || 4;
    const maxRetries = this.config.client?.maxRetries || 5;
    
    let attempts = 0;
    
    while (attempts < maxRetries * 100) { // Set a maximum to prevent infinite loops
      attempts++;
      
      // Generate a random nonce
      const nonce = CryptoUtils.generateNonce();
      
      // Compute hash
      const dataToHash = `${endpoint}:${timestamp}:${nonce}:${context}`;
      const stamp = CryptoUtils.sha256(dataToHash);
      
      // Check if the hash has the required number of leading zeros
      if (CryptoUtils.hasLeadingZeros(stamp, difficulty)) {
        return { nonce, stamp };
      }
      
      // If we've hit a retry boundary, pause briefly to not block the main thread
      if (attempts % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    throw new Error(`Failed to generate valid PoW after ${attempts} attempts`);
  }

  /**
   * Generates a context based on the user agent
   * @returns Context hash
   */
  private generateContext(): string {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    return CryptoUtils.generateContext(userAgent, undefined, this.config.contextGenerator);
  }

  /**
   * Checks if an endpoint is in the protected list
   * @param endpoint Endpoint to check
   * @returns True if the endpoint is protected
   */
  private isProtectedEndpoint(endpoint: string): boolean {
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
}