import { PowClient } from '../src/client';
import { PowCloudflare } from '../src/cloudflare';
import { PowServer } from '../src/server';
import { CryptoUtils } from '../src/utils/crypto';

jest.mock('../src/utils/crypto', () => ({
  CryptoUtils: {
    sha256: jest.fn().mockImplementation(data => `mocked-hash-${data}`),
    hmac: jest.fn().mockImplementation((data, secret) => 'valid-hmac-signature'),
    hasLeadingZeros: jest.fn().mockReturnValue(true),
    generateNonce: jest.fn().mockReturnValue('mocked-nonce'),
    generateContext: jest.fn().mockReturnValue('mocked-context')
  }
}));

describe('PoW Shield Integration', () => {
  // Shared configuration for all components
  const sharedConfig = {
    endpoints: ['/api/protected'],
    secret: 'test-integration-secret',
    difficulty: 2, // Lower difficulty for faster tests
    timestampTolerance: 30
  };
  
  // Create instances of all components
  const client = new PowClient(sharedConfig);
  const cloudflare = new PowCloudflare(sharedConfig);
  const server = new PowServer(sharedConfig);
  

class MockResponse {
  statusCode: number;  // Changed from 'status' to 'statusCode'
  body: any;
  headers: Map<string, string>;
  
  constructor() {
    this.statusCode = 200;  // Changed from 'status' to 'statusCode'
    this.body = null;
    this.headers = new Map();
  }
  
  // Add this method
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  
  json(data: any) {
    this.body = data;
    return this;
  }
  
  send(data: any) {
    this.body = data;
    return this;
  }
}
  
it('should successfully validate a request through the entire flow', async () => {
  // Clear mocks and configure HMAC
  jest.clearAllMocks();
  (CryptoUtils.hmac as jest.Mock).mockImplementation(() => 'valid-hmac-signature');
  
  // Step 1: Generate PoW headers from client
  const clientHeaders = await client.getHeaders('/api/protected');
  
  // Create a mock request to Cloudflare with these headers
  const mockRequest = new Request('https://example.com/api/protected', {
    method: 'GET',
    headers: clientHeaders as any
  });
  
  // Step 2: Process the request through Cloudflare
  const cloudflareResponse = await cloudflare.handleRequest(mockRequest);
  
  // Cloudflare should not return a response (pass to origin)
  expect(cloudflareResponse).toBeNull();
  
  // Extract the modified request with HMAC header
  const modifiedRequestHeaders = (mockRequest as any).headers;
  
  // Step 3: Create an Express-like request object for the server
  const serverRequest = {
    path: '/api/protected',
    headers: {} as Record<string, string> // Add type annotation
  };
  
  // FIXED: Create all headers at once with proper typing
  const headerObj: Record<string, string> = {}; // Add type annotation
  modifiedRequestHeaders.forEach((value: string, key: string) => {
    headerObj[key.toLowerCase()] = value;
  });
  serverRequest.headers = headerObj;
  
  // Now TypeScript will allow indexing
  serverRequest.headers['x-hmac'] = 'valid-hmac-signature';
  
  // For debugging - uncomment to see headers
  // console.log('Server request headers:', serverRequest.headers);
  
  // Create mock Express response and next function
  const serverResponse = new MockResponse();
  const nextFunction = jest.fn();
  
  // Process the request through the server middleware
  const expressMiddleware = server.expressMiddleware();
  expressMiddleware(serverRequest, serverResponse, nextFunction);
  
  // Verify that next() was called (request was valid)
  expect(nextFunction).toHaveBeenCalled();
  expect(serverResponse.statusCode).toBe(200);
});
  
  it('should reject a request with tampered headers', async () => {
    // Step 1: Generate PoW headers from client
    const clientHeaders = await client.getHeaders('/api/protected');
    
    // Tamper with the headers
    const tamperedHeaders = { ...clientHeaders };
    tamperedHeaders['X-Context'] = 'tampered-context';
    
    // Create a mock request to Cloudflare with tampered headers
    const mockRequest = new Request('https://example.com/api/protected', {
      method: 'GET',
      headers: tamperedHeaders as any
    });
    
    // Step 2: Process the request through Cloudflare
    const cloudflareResponse = await cloudflare.handleRequest(mockRequest);
    
    // Cloudflare should return a 403 response
    expect(cloudflareResponse).toBeInstanceOf(Response);
    expect(cloudflareResponse?.status).toBe(403);
  });
  
  it('should reject requests to protected endpoints without PoW headers', async () => {
    // Create a mock request to Cloudflare without PoW headers
    const mockRequest = new Request('https://example.com/api/protected', {
      method: 'GET'
    });
    
    // Process the request through Cloudflare
    const cloudflareResponse = await cloudflare.handleRequest(mockRequest);
    
    // Cloudflare should return a 400 response
    expect(cloudflareResponse).toBeInstanceOf(Response);
    expect(cloudflareResponse?.status).toBe(400);
  });
  
  it('should pass through requests to non-protected endpoints', async () => {
    // Create a mock request to a non-protected endpoint
    const mockRequest = new Request('https://example.com/public', {
      method: 'GET'
    });
    
    // Process the request through Cloudflare
    const cloudflareResponse = await cloudflare.handleRequest(mockRequest);
    
    // Cloudflare should not return a response (pass to origin)
    expect(cloudflareResponse).toBeNull();
    
    // Server should also pass it through
    const serverRequest = {
      path: '/public',
      headers: {}
    };
    
    const serverResponse = new MockResponse();
    const nextFunction = jest.fn();
    
    const expressMiddleware = server.expressMiddleware();
    expressMiddleware(serverRequest, serverResponse, nextFunction);
    
    // Verify that next() was called
    expect(nextFunction).toHaveBeenCalled();
  });
});