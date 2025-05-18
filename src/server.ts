import { PowShieldConfig, validateAndMergeConfig } from './config';
import { CryptoUtils } from './utils/crypto';

export class PowServer {
  private config: PowShieldConfig;

  constructor(config: Partial<PowShieldConfig>) {
    this.config = validateAndMergeConfig(config);
  }

  /**
   * Creates middleware for Express
   * @returns Express middleware function
   */
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      // Skip validation for non-protected endpoints
      if (!this.isProtectedEndpoint(req.path)) {
        return next();
      }

      // Check for HMAC header
      const hmacSignature = req.headers['x-hmac'];
      if (!hmacSignature) {
        if (this.config.server?.strictMode) {
          return res.status(403).send('Missing HMAC signature');
        }
        return next();
      }

      // Extract required headers for validation
      const timestamp = req.headers['x-timestamp'];
      const nonce = req.headers['x-nonce'];
      const context = req.headers['x-context'];

      if (!timestamp || !nonce || !context) {
        return res.status(400).send('Missing required headers');
      }

      // Validate HMAC
      const hmacData = `${timestamp}:${nonce}:${context}`;
      const expectedHmac = CryptoUtils.hmac(
        hmacData, 
        this.config.secret || '', 
        this.config.hmacAlgorithm
      );

      if (hmacSignature !== expectedHmac) {
        return res.status(403).send('Invalid HMAC signature');
      }

      // HMAC is valid, proceed with request
      next();
    };
  }

  /**
   * Creates plugin for Fastify
   * @returns Fastify plugin
   */
  fastifyPlugin() {
    const plugin = (fastify: any, options: any, done: any) => {
      fastify.addHook('preHandler', (request: any, reply: any, done: any) => {
        // Skip validation for non-protected endpoints
        if (!this.isProtectedEndpoint(request.url)) {
          return done();
        }

        // Check for HMAC header
        const hmacSignature = request.headers['x-hmac'];
        if (!hmacSignature) {
          if (this.config.server?.strictMode) {
            return reply.code(403).send('Missing HMAC signature');
          }
          return done();
        }

        // Extract required headers for validation
        const timestamp = request.headers['x-timestamp'];
        const nonce = request.headers['x-nonce'];
        const context = request.headers['x-context'];

        if (!timestamp || !nonce || !context) {
          return reply.code(400).send('Missing required headers');
        }

        // Validate HMAC
        const hmacData = `${timestamp}:${nonce}:${context}`;
        const expectedHmac = CryptoUtils.hmac(
          hmacData, 
          this.config.secret || '', 
          this.config.hmacAlgorithm
        );

        if (hmacSignature !== expectedHmac) {
          return reply.code(403).send('Invalid HMAC signature');
        }

        // HMAC is valid, proceed with request
        done();
      });

      done();
    };

    return plugin;
  }

  /**
   * Creates middleware for Koa
   * @returns Koa middleware function
   */
  koaMiddleware() {
    return async (ctx: any, next: any) => {
      // Skip validation for non-protected endpoints
      if (!this.isProtectedEndpoint(ctx.path)) {
        return next();
      }

      // Check for HMAC header
      const hmacSignature = ctx.headers['x-hmac'];
      if (!hmacSignature) {
        if (this.config.server?.strictMode) {
          ctx.status = 403;
          ctx.body = 'Missing HMAC signature';
          return;
        }
        return next();
      }

      // Extract required headers for validation
      const timestamp = ctx.headers['x-timestamp'];
      const nonce = ctx.headers['x-nonce'];
      const context = ctx.headers['x-context'];

      if (!timestamp || !nonce || !context) {
        ctx.status = 400;
        ctx.body = 'Missing required headers';
        return;
      }

      // Validate HMAC
      const hmacData = `${timestamp}:${nonce}:${context}`;
      const expectedHmac = CryptoUtils.hmac(
        hmacData, 
        this.config.secret || '', 
        this.config.hmacAlgorithm
      );

      if (hmacSignature !== expectedHmac) {
        ctx.status = 403;
        ctx.body = 'Invalid HMAC signature';
        return;
      }

      // HMAC is valid, proceed with request
      await next();
    };
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