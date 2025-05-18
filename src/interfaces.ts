/**
 * Base interface for client-side PoW Shield
 */
export interface PowClient {
    /**
     * Makes a fetch request with PoW headers
     * @param url URL to fetch
     * @param options Fetch options
     * @returns Fetch response
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
    
    /**
     * Gets PoW headers for a request
     * @param endpoint API endpoint
     * @returns Headers object with PoW headers
     */
    getHeaders(endpoint: string): Promise<Record<string, string>>;
  }
  
  /**
   * Base interface for Cloudflare Worker PoW Shield
   */
  export interface PowCloudflare {
    /**
     * Handles an incoming request
     * @param request Incoming request
     * @returns Response or null if request should be passed to origin
     */
    handleRequest(request: Request): Promise<Response | null>;
  }
  
  /**
   * Base interface for Server-side PoW Shield
   */
  export interface PowServer {
    /**
     * Creates middleware for Express
     * @returns Express middleware function
     */
    expressMiddleware(): any;
    
    /**
     * Creates plugin for Fastify
     * @returns Fastify plugin
     */
    fastifyPlugin(): any;
    
    /**
     * Creates middleware for Koa
     * @returns Koa middleware function
     */
    koaMiddleware(): any;
  }