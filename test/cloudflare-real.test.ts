import { PowCloudflare } from '../src/cloudflare';
import { CryptoUtils } from '../src/utils/crypto';

// Only mock the CryptoUtils functions that need to be controlled in tests
jest.mock('../src/utils/crypto', () => {
  // Save a reference to the actual implementation
  const actualCrypto = jest.requireActual('../src/utils/crypto');
  
  return {
    CryptoUtils: {
      // Use specific mocks only for functions we need to control
      sha256: jest.fn().mockImplementation(data => `mocked-hash-${data}`),
      hmac: jest.fn().mockReturnValue('mocked-hmac'),
      hasLeadingZeros: jest.fn().mockReturnValue(true),
      
      // Use real implementations for the rest
      generateNonce: actualCrypto.CryptoUtils.generateNonce,
      generateContext: actualCrypto.CryptoUtils.generateContext
    }
  };
});

// Note: We're NOT mocking LRUCache anymore - using the real implementation

describe('PowCloudflare', () => {
  let powCloudflare: PowCloudflare;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a Cloudflare Worker instance with test configuration
    powCloudflare = new PowCloudflare({
      endpoints: ['/api/test', '/api/data'],
      secret: 'test-secret',
      difficulty: 4,
      cacheType: 'memory',
      cacheSize: 10, // Small cache size for testing
      cloudflare: {
        rateLimiting: true,
        requestsPerMinute: 5
      }
    });
  });
  
  describe('handleRequest', () => {
    let mockRequest: Request;
    
    beforeEach(() => {
      // Create a mock request with required headers
      mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Nonce': 'test-nonce',
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp',
          'CF-Connecting-IP': '192.168.1.2'
        }
      });
    });
    
    it('should pass through non-protected endpoints', async () => {
      const nonProtectedRequest = new Request('https://example.com/public');
      
      const result = await powCloudflare.handleRequest(nonProtectedRequest);
      
      // Should return null to pass through to origin
      expect(result).toBeNull();
    });
    
    it('should reject requests without required headers', async () => {
      const incompleteRequest = new Request('https://example.com/api/test');
      
      const result = await powCloudflare.handleRequest(incompleteRequest);
      
      // Should return a 400 response
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(400);
    });
    
    it('should reject requests with expired timestamps', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 60; // 60 seconds old
      const expiredRequest = new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': oldTimestamp.toString(),
          'X-Nonce': 'test-nonce',
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp'
        }
      });
      
      const result = await powCloudflare.handleRequest(expiredRequest);
      
      // Should return a 403 response
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });
    
    it('should reject requests with used nonces', async () => {
      // First request will cache the nonce
      (CryptoUtils.sha256 as jest.Mock).mockReturnValue('test-stamp');
      await powCloudflare.handleRequest(mockRequest);
      
      // Second request with same nonce should be rejected
      const result = await powCloudflare.handleRequest(mockRequest);
      
      // Should return a 403 response for nonce reuse
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });
    
    it('should reject requests that exceed rate limits', async () => {
      // Set up the rate limiting test
      const rateLimitRequest = new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Nonce': 'rate-limit-nonce',
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp',
          'CF-Connecting-IP': '192.168.1.3' // Use a specific IP for rate limiting
        }
      });
      
      // Make sure sha256 returns the expected stamp to pass verification
      (CryptoUtils.sha256 as jest.Mock).mockReturnValue('test-stamp');
      
      // Submit requests up to the limit
      for (let i = 0; i < 5; i++) {
        const uniqueRequest = new Request('https://example.com/api/test', {
          headers: {
            'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
            'X-Nonce': `nonce-${i}`,
            'X-Context': 'test-context',
            'X-Stamp': 'test-stamp',
            'CF-Connecting-IP': '192.168.1.3'
          }
        });
        const result = await powCloudflare.handleRequest(uniqueRequest);
        expect(result).toBeNull(); // Should pass through
      }
      
      // One more request should hit the rate limit
      const limitResult = await powCloudflare.handleRequest(new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Nonce': 'over-limit-nonce',
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp',
          'CF-Connecting-IP': '192.168.1.3'
        }
      }));
      
      // Should return a 429 response
      expect(limitResult).toBeInstanceOf(Response);
      expect(limitResult?.status).toBe(429);
    });
    
    it('should add HMAC signature to valid requests', async () => {
      // Mock valid stamp and hash validation
      (CryptoUtils.sha256 as jest.Mock).mockReturnValue('test-stamp');
      
      const result = await powCloudflare.handleRequest(mockRequest);
      
      // Should return null to pass to origin with modified headers
      expect(result).toBeNull();
      
      // Verify HMAC was generated
      expect(CryptoUtils.hmac).toHaveBeenCalled();
    });
  });
});