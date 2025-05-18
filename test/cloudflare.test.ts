import { PowCloudflare } from '../src/cloudflare';
import { CryptoUtils } from '../src/utils/crypto';
import { LRUCache } from 'lru-cache';

// Mock the CryptoUtils for controlled testing
jest.mock('../src/utils/crypto', () => ({
  CryptoUtils: {
    sha256: jest.fn().mockImplementation(data => `mocked-hash-${data}`),
    hmac: jest.fn().mockImplementation((data, secret) => `mocked-hmac-${data}-${secret}`),
    hasLeadingZeros: jest.fn().mockReturnValue(true)
  }
}));

// Mock LRU Cache
jest.mock('lru-cache', () => {
  return {
    LRUCache: jest.fn().mockImplementation(() => ({
      has: jest.fn().mockImplementation(key => key === 'existing-nonce'),
      set: jest.fn(),
      get: jest.fn().mockImplementation(key => key === 'rate:192.168.1.1' ? 5 : 0)
    }))
  };
});

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
      cacheSize: 1000,
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
      const nonceRequest = new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Nonce': 'existing-nonce', // This nonce is marked as used in our mock
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp'
        }
      });
      
      const result = await powCloudflare.handleRequest(nonceRequest);
      
      // Should return a 403 response
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });
    
    it('should reject requests that exceed rate limits', async () => {
      const rateLimitRequest = new Request('https://example.com/api/test', {
        headers: {
          'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Nonce': 'test-nonce',
          'X-Context': 'test-context',
          'X-Stamp': 'test-stamp',
          'CF-Connecting-IP': '192.168.1.1' // This IP is over the rate limit in our mock
        }
      });
      
      // Configure hasLeadingZeros to return true for validation
      (CryptoUtils.hasLeadingZeros as jest.Mock).mockReturnValueOnce(true);

      (CryptoUtils.sha256 as jest.Mock).mockReturnValueOnce('test-stamp');
      
      const result = await powCloudflare.handleRequest(rateLimitRequest);
      
      // Should return a 429 response
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(429);
    });
    
    it('should add HMAC signature to valid requests', async () => {
      // Mock valid stamp and hash validation
      (CryptoUtils.sha256 as jest.Mock).mockReturnValueOnce('test-stamp');
      (CryptoUtils.hasLeadingZeros as jest.Mock).mockReturnValueOnce(true);
      
      const result = await powCloudflare.handleRequest(mockRequest);
      
      // Should return null to pass to origin with modified headers
      expect(result).toBeNull();
      
      // Verify HMAC was generated
      expect(CryptoUtils.hmac).toHaveBeenCalled();
    });
  });
});