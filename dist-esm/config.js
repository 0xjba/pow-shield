/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
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
 * @returns Merged configuration
 */
export function validateAndMergeConfig(config) {
    // Start with default config
    const mergedConfig = { ...DEFAULT_CONFIG };
    // Merge provided config
    if (config) {
        // Merge top-level properties
        Object.keys(config).forEach(key => {
            const typedKey = key;
            if (typedKey !== 'client' && typedKey !== 'cloudflare' && typedKey !== 'server') {
                mergedConfig[typedKey] = config[typedKey];
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
    if (!mergedConfig.secret) {
        throw new Error('PoW Shield requires a shared secret for HMAC generation');
    }
    return mergedConfig;
}
