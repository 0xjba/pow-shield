#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { program } = require('commander');

// CLI version
const version = require('../package.json').version;

// Create command-line interface
program
  .name('pow-shield-deploy')
  .description('Deploy PoW Shield to Cloudflare Workers')
  .version(version)
  .option('-e, --endpoints <endpoints>', 'Comma-separated list of protected API endpoints (required)')
  .option('-d, --difficulty <difficulty>', 'PoW difficulty level', '4')
  .option('-t, --tolerance <seconds>', 'Timestamp tolerance in seconds', '30')
  .option('-c, --cache-size <size>', 'Size of nonce cache', '10000')
  .option('-r, --rate-limit <enabled>', 'Enable rate limiting', 'true')
  .option('-l, --limit <requests>', 'Requests per minute per IP', '30')
  .option('-n, --name <name>', 'Worker name', 'pow-shield-worker')
  .option('-o, --output <directory>', 'Output directory', '.pow-shield-worker')
  .option('-s, --secret <secret>', 'HMAC secret (not recommended, use prompts instead)')
  .option('--no-deploy', 'Generate files without deploying')
  .option('--route <pattern>', 'Add a route pattern (e.g., example.com/api/*)')
  .option('--zone <name>', 'Zone name for the route');

program.parse();

const options = program.opts();

// Validate required options
if (!options.endpoints) {
  console.error('Error: --endpoints option is required');
  process.exit(1);
}

// Ask for secret if not provided
async function getSecret() {
  if (options.secret) {
    return options.secret;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Enter your HMAC secret (will not be shown): ', (answer) => {
      rl.close();
      console.log(); // Add newline
      resolve(answer);
    });
    
    // Hide input
    process.stdin.on('data', (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdout.write('\n');
          break;
        default:
          process.stdout.write('*');
          break;
      }
    });
  });
}

// Format endpoints for wrangler.toml
function formatEndpoints(endpoints) {
  const endpointList = endpoints.split(',').map(e => e.trim());
  return JSON.stringify(endpointList).replace(/"/g, '\\"');
}

// Create the worker directory structure
async function createWorkerFiles(secret) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }
  
  // Copy the worker script
  const workerScriptPath = path.join(__dirname, '../examples/cloudflare-worker-universal.js');
  const workerScriptContent = fs.readFileSync(workerScriptPath, 'utf8');
  fs.writeFileSync(path.join(options.output, 'worker.js'), workerScriptContent);
  
  // Create wrangler.toml from template
  const wranglerTemplatePath = path.join(__dirname, '../examples/wrangler.toml.template');
  let wranglerContent = fs.readFileSync(wranglerTemplatePath, 'utf8');
  
  // Replace placeholders with actual values
  wranglerContent = wranglerContent
    .replace('name = "pow-shield-worker"', `name = "${options.name}"`)
    .replace('__ENDPOINTS__', formatEndpoints(options.endpoints))
    .replace('__DIFFICULTY__', options.difficulty)
    .replace('__TIMESTAMP_TOLERANCE__', options.tolerance)
    .replace('__CACHE_SIZE__', options.cacheSize)
    .replace('__RATE_LIMITING__', options.rateLimit)
    .replace('__REQUESTS_PER_MINUTE__', options.limit);
  
  // Add route if specified
  if (options.route && options.zone) {
    wranglerContent = wranglerContent.replace(
      '# [triggers]',
      '[triggers]'
    ).replace(
      '# routes = [',
      'routes = ['
    ).replace(
      '#   { pattern = "__ROUTE_PATTERN__", zone_name = "__ZONE_NAME__" }',
      `  { pattern = "${options.route}", zone_name = "${options.zone}" }`
    ).replace(
      '# ]',
      ']'
    );
  }
  
  fs.writeFileSync(path.join(options.output, 'wrangler.toml'), wranglerContent);
  
  console.log(`Worker files created in: ${options.output}`);
  
  return {
    workerDir: options.output,
    secret
  };
}

// Deploy to Cloudflare Workers
async function deployWorker({ workerDir, secret }) {
  if (!options.deploy) {
    console.log('Deployment skipped. To deploy manually:');
    console.log(`cd ${workerDir}`);
    console.log('wrangler secret put POW_SECRET');
    console.log('wrangler deploy');
    return;
  }
  
  console.log('Deploying to Cloudflare Workers...');
  
  // Change to worker directory
  process.chdir(workerDir);
  
  // Set secret
  console.log('Setting POW_SECRET...');
  const secretProcess = spawn('wrangler', ['secret', 'put', 'POW_SECRET'], {
    stdio: ['pipe', 'inherit', 'inherit']
  });
  
  secretProcess.stdin.write(secret);
  secretProcess.stdin.end();
  
  await new Promise((resolve) => {
    secretProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Failed to set secret. Make sure you have Wrangler installed and configured.');
        process.exit(1);
      }
      resolve();
    });
  });
  
  // Deploy worker
  console.log('Deploying worker...');
  const deployProcess = spawn('wrangler', ['deploy'], {
    stdio: 'inherit'
  });
  
  await new Promise((resolve) => {
    deployProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Failed to deploy worker. Check wrangler logs for details.');
        process.exit(1);
      }
      resolve();
    });
  });
  
  console.log('PoW Shield Worker deployed successfully!');
}

// Main function
async function main() {
  try {
    console.log('PoW Shield Worker Deployment');
    console.log('===========================');
    
    const secret = await getSecret();
    const workerConfig = await createWorkerFiles(secret);
    await deployWorker(workerConfig);
    
    console.log('\nDeployment complete!');
    console.log('\nRemember to:');
    console.log('1. Configure your client-side with PoW Shield');
    console.log('2. Set up your origin server with the same HMAC secret');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();