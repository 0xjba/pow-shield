/**
 * Configuration options for the PoW Shield package
 */
export interface PowShieldConfig {
  // Core options (required in at least one of these)
  endpoints?: string[];          // List of endpoints to protect
  secret?: string;               // Shared HMAC secret key
  
  // PoW settings
  difficulty?: number;           // Number of leading zero bits (default: 4)
  timestampTolerance?: number;   // Seconds (default: 30)
  
  // Cache settings
  cacheType?: 'memory' | 'durableObject' | 'kv'; // Cache type for nonce storage (default: 'memory')
  cacheSize?: number;            // Number of nonces to store in memory (default: 10000)
  
  // Advanced options
  contextGenerator?: 'userAgent' | 'ip+userAgent' | 'custom'; // How to generate context (default: 'userAgent')
  hmacAlgorithm?: 'sha256' | 'sha512'; // HMAC algorithm (default: 'sha256')
  
  // Environment-specific options
  client?: {
    maxRetries?: number;         // Maximum number of PoW retries (default: 5)
    requestIntegration?: 'fetch' | 'axios' | 'xhr'; // HTTP client (default: 'fetch')
  };
  
  cloudflare?: {
    rateLimiting?: boolean;      // Whether to rate limit requests (default: true)
    requestsPerMinute?: number;  // Requests per minute per IP (default: 30)
  };
  
  server?: {
    framework?: 'express' | 'fastify' | 'koa'; // Server framework (default: 'express')
    strictMode?: boolean;        // Reject requests without valid HMAC (default: true)
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: PowShieldConfig = {
  difficulty: 4,
  timestampTolerance: 30,
  cacheType: 'memory',
  cacheSize: 10000,
  contextGenerator: 'userAgent',
  hmacAlgorithm: 'sha256',
  client: {
    maxRetries: 5,
    requestIntegration: 'fetch'
  },
  cloudflare: {
    rateLimiting: true,
    requestsPerMinute: 30
  },
  server: {
    framework: 'express',
    strictMode: true
  }
};

/**
 * Validates and merges provided configuration with defaults
 * @param config User-provided configuration
 * @param context Context for validation ('client' | 'server' | 'cloudflare')
 * @returns Merged configuration
 */
export function validateAndMergeConfig(
  config: Partial<PowShieldConfig>, 
  context: 'client' | 'server' | 'cloudflare' = 'client'
): PowShieldConfig {
  // Start with default config
  const mergedConfig: PowShieldConfig = { ...DEFAULT_CONFIG };

  // Merge provided config
  if (config) {
    // Merge top-level properties
    Object.keys(config).forEach(key => {
      const typedKey = key as keyof PowShieldConfig;
      if (typedKey !== 'client' && typedKey !== 'cloudflare' && typedKey !== 'server') {
        (mergedConfig as any)[typedKey] = (config as any)[typedKey];
      }
    });

    // Merge nested configurations
    if (config.client) {
      mergedConfig.client = { ...DEFAULT_CONFIG.client, ...config.client };
    }
    if (config.cloudflare) {
      mergedConfig.cloudflare = { ...DEFAULT_CONFIG.cloudflare, ...config.cloudflare };
    }
    if (config.server) {
      mergedConfig.server = { ...DEFAULT_CONFIG.server, ...config.server };
    }
  }

  // Validate required configurations
  if (!mergedConfig.endpoints || mergedConfig.endpoints.length === 0) {
    throw new Error('PoW Shield requires at least one endpoint to protect');
  }
  
  // Only require secret for server and cloudflare contexts, not for client
  if ((context === 'server' || context === 'cloudflare') && !mergedConfig.secret) {
    throw new Error('PoW Shield requires a shared secret for HMAC generation');
  }

  return mergedConfig;
}