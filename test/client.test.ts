import { PowClient } from '../src/client';
import { CryptoUtils } from '../src/utils/crypto';

// Mock the CryptoUtils for controlled testing
jest.mock('../src/utils/crypto', () => ({
  CryptoUtils: {
    sha256: jest.fn().mockImplementation(data => `mocked-hash-${data}`),
    hmac: jest.fn().mockImplementation((data, secret) => `mocked-hmac-${data}-${secret}`),
    generateNonce: jest.fn().mockReturnValue('mocked-nonce'),
    hasLeadingZeros: jest.fn().mockReturnValue(true),
    generateContext: jest.fn().mockReturnValue('mocked-context')
  }
}));

describe('PowClient', () => {
  let powClient: PowClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a client instance with test configuration
    powClient = new PowClient({
      endpoints: ['/api/test', '/api/data'],
      secret: 'test-secret',
      difficulty: 4
    });
  });
  
  describe('getHeaders', () => {
    it('should generate valid PoW headers', async () => {
      const headers = await powClient.getHeaders('/api/test');
      
      // Check that all required headers are present
      expect(headers).toHaveProperty('X-Timestamp');
      expect(headers).toHaveProperty('X-Nonce');
      expect(headers).toHaveProperty('X-Context');
      expect(headers).toHaveProperty('X-Stamp');
      
      // Verify CryptoUtils was called correctly
      expect(CryptoUtils.generateNonce).toHaveBeenCalled();
      expect(CryptoUtils.generateContext).toHaveBeenCalled();
      expect(CryptoUtils.sha256).toHaveBeenCalled();
      expect(CryptoUtils.hasLeadingZeros).toHaveBeenCalled();
    });
  });
  
  describe('fetch', () => {
    let originalFetch: any;
    let mockFetchResponse: any;
    
    beforeEach(() => {
      // Save original fetch and mock it
      originalFetch = global.fetch;
      
      mockFetchResponse = { 
        json: jest.fn().mockResolvedValue({ success: true }) 
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
    });
    
    afterEach(() => {
      // Restore original fetch
      global.fetch = originalFetch;
    });
    
    it('should add PoW headers to protected endpoints', async () => {
      await powClient.fetch('https://example.com/api/test');
      
      // Verify fetch was called with PoW headers
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;
      
      expect(url).toBe('https://example.com/api/test');
      expect(options.headers).toHaveProperty('X-Timestamp');
      expect(options.headers).toHaveProperty('X-Nonce');
      expect(options.headers).toHaveProperty('X-Context');
      expect(options.headers).toHaveProperty('X-Stamp');
    });
    
    it('should not add PoW headers to non-protected endpoints', async () => {
      await powClient.fetch('https://example.com/public');
      
      // Verify fetch was called without PoW headers
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;
      
      expect(url).toBe('https://example.com/public');
      
      // No PoW headers should be present
      expect(options && options.headers ? options.headers : {}).not.toHaveProperty('X-Timestamp');
      expect(options && options.headers ? options.headers : {}).not.toHaveProperty('X-Nonce');
      expect(options && options.headers ? options.headers : {}).not.toHaveProperty('X-Context');
      expect(options && options.headers ? options.headers : {}).not.toHaveProperty('X-Stamp');
    });
    
    it('should merge provided headers with PoW headers', async () => {
      const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      };
      
      await powClient.fetch('https://example.com/api/test', {
        headers: customHeaders
      });
      
      // Verify fetch was called with merged headers
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [, options] = fetchCall;
      
      expect(options.headers).toHaveProperty('Content-Type', 'application/json');
      expect(options.headers).toHaveProperty('Authorization', 'Bearer token');
      expect(options.headers).toHaveProperty('X-Timestamp');
      expect(options.headers).toHaveProperty('X-Nonce');
      expect(options.headers).toHaveProperty('X-Context');
      expect(options.headers).toHaveProperty('X-Stamp');
    });
  });
});