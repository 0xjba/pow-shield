import { validateAndMergeConfig } from './config.js';
import { PowClient } from './client.js';
import { PowCloudflare } from './cloudflare.js';
import { PowServer } from './server.js';

// Export all components directly
export { 
  PowClient, 
  PowCloudflare, 
  PowServer,
  validateAndMergeConfig 
};

// Export types
export type { PowShieldConfig } from './config.js';