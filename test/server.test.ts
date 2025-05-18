import { PowServer } from '../src/server';
import { CryptoUtils } from '../src/utils/crypto';

// Mock the CryptoUtils for controlled testing
jest.mock('../src/utils/crypto', () => ({
  CryptoUtils: {
    hmac: jest.fn().mockImplementation((data, secret) => 
      data === 'valid:valid:valid' ? 'valid-hmac' : 'different-hmac') // Changed from 'invalid-hmac' to 'different-hmac'
  }
}));

describe('PowServer', () => {
  let powServer: PowServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a server instance with test configuration
    powServer = new PowServer({
      endpoints: ['/api/test', '/api/data'],
      secret: 'test-secret'
    });
  });
  
  describe('expressMiddleware', () => {
    it('should pass through non-protected endpoints', () => {
      const req = { path: '/public' };
      const res = {};
      const next = jest.fn();
      
      const middleware = powServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should call next() without error
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
    
    it('should reject requests without HMAC signature in strict mode', () => {
      const req = { 
        path: '/api/test', 
        headers: {} // No HMAC header
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis() // Updated to chain
      };
      const next = jest.fn();
      
      const middleware = powServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should return 403
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should allow requests without HMAC signature in non-strict mode', () => {
      // Create server with non-strict mode
      const nonStrictServer = new PowServer({
        endpoints: ['/api/test', '/api/data'],
        secret: 'test-secret',
        server: {
          strictMode: false
        }
      });
      
      const req = { 
        path: '/api/test', 
        headers: {} 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis() // Updated to chain
      };
      const next = jest.fn();
      
      const middleware = nonStrictServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should call next() without error
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should reject requests with missing headers', () => {
      const req = { 
        path: '/api/test', 
        headers: {
          'x-hmac': 'test-hmac'
          // Missing required headers
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis() // Updated to chain
      };
      const next = jest.fn();
      
      const middleware = powServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should return 400
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject requests with invalid HMAC signature', () => {
      const req = { 
        path: '/api/test', 
        headers: {
          'x-hmac': 'invalid-hmac', // This won't match 'different-hmac' from the mock
          'x-timestamp': '1623456789',
          'x-nonce': 'test-nonce',
          'x-context': 'test-context'
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis() // Updated to chain
      };
      const next = jest.fn();
      
      const middleware = powServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should return 403
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should accept requests with valid HMAC signature', () => {
      const req = { 
        path: '/api/test', 
        headers: {
          'x-hmac': 'valid-hmac',
          'x-timestamp': 'valid',
          'x-nonce': 'valid',
          'x-context': 'valid'
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis() // Updated to chain
      };
      const next = jest.fn();
      
      const middleware = powServer.expressMiddleware();
      middleware(req, res, next);
      
      // Should call next() without error
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
  
  describe('fastifyPlugin', () => {
    it('should register preHandler hook', () => {
      const fastify = {
        addHook: jest.fn()
      };
      const options = {};
      const done = jest.fn();
      
      const plugin = powServer.fastifyPlugin();
      plugin(fastify, options, done);
      
      // Should add preHandler hook
      expect(fastify.addHook).toHaveBeenCalledTimes(1);
      expect(fastify.addHook).toHaveBeenCalledWith('preHandler', expect.any(Function));
      
      // Should call done
      expect(done).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('koaMiddleware', () => {
    it('should validate HMAC signature', async () => {
      const middleware = powServer.koaMiddleware();
      
      // Valid request
      const validCtx = {
        path: '/api/test',
        headers: {
          'x-hmac': 'valid-hmac',
          'x-timestamp': 'valid',
          'x-nonce': 'valid',
          'x-context': 'valid'
        }
      };
      const validNext = jest.fn().mockResolvedValue(undefined);
      
      await middleware(validCtx, validNext);
      
      // Should call next() for valid request
      expect(validNext).toHaveBeenCalledTimes(1);
      
      // Reset mock state
      jest.clearAllMocks();
      
      // Invalid request
      const invalidCtx = {
        path: '/api/test',
        headers: {
          'x-hmac': 'invalid-hmac', // This won't match 'different-hmac' from the mock
          'x-timestamp': 'invalid',
          'x-nonce': 'invalid',
          'x-context': 'invalid'
        },
        status: undefined,
        body: undefined
      };
      const invalidNext = jest.fn().mockResolvedValue(undefined);
      
      await middleware(invalidCtx, invalidNext);
      
      // Should not call next for invalid request
      expect(invalidNext).not.toHaveBeenCalled();
      expect(invalidCtx.status).toBe(403);
    });
  });
});