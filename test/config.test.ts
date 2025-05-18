import { validateAndMergeConfig, DEFAULT_CONFIG } from '../src/config';

describe('Configuration', () => {
  describe('validateAndMergeConfig', () => {
    it('should merge user config with default config', () => {
      const userConfig = {
        endpoints: ['/api/test'],
        secret: 'test-secret',
        difficulty: 6
      };
      
      const mergedConfig = validateAndMergeConfig(userConfig);
      
      // Should include user overrides
      expect(mergedConfig.endpoints).toEqual(['/api/test']);
      expect(mergedConfig.secret).toBe('test-secret');
      expect(mergedConfig.difficulty).toBe(6);
      
      // Should include defaults for non-overridden options
      expect(mergedConfig.timestampTolerance).toBe(DEFAULT_CONFIG.timestampTolerance);
      expect(mergedConfig.cacheType).toBe(DEFAULT_CONFIG.cacheType);
    });
    
    it('should merge nested configurations', () => {
      const userConfig = {
        endpoints: ['/api/test'],
        secret: 'test-secret',
        client: {
          maxRetries: 10
        },
        server: {
          strictMode: false
        }
      };
      
      const mergedConfig = validateAndMergeConfig(userConfig);
      
      // Should merge nested client config
      expect(mergedConfig.client?.maxRetries).toBe(10);
      expect(mergedConfig.client?.requestIntegration).toBe(DEFAULT_CONFIG.client?.requestIntegration);
      
      // Should merge nested server config
      expect(mergedConfig.server?.strictMode).toBe(false);
      expect(mergedConfig.server?.framework).toBe(DEFAULT_CONFIG.server?.framework);
      
      // Cloudflare config should use defaults
      expect(mergedConfig.cloudflare).toEqual(DEFAULT_CONFIG.cloudflare);
    });
    
    it('should throw if required configs are missing', () => {
      // Missing endpoints
      expect(() => validateAndMergeConfig({
        secret: 'test-secret'
      })).toThrow('PoW Shield requires at least one endpoint to protect');
      
      // Missing secret
      expect(() => validateAndMergeConfig({
        endpoints: ['/api/test']
      })).toThrow('PoW Shield requires a shared secret for HMAC generation');
      
      // Empty endpoints array
      expect(() => validateAndMergeConfig({
        endpoints: [],
        secret: 'test-secret'
      })).toThrow('PoW Shield requires at least one endpoint to protect');
    });
  });
});