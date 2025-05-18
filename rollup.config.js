import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { createRequire } from 'module';

// Create require for ES modules
const require = createRequire(import.meta.url);

export default [
  // Browser bundle for client only
  {
    input: 'src/client.ts',
    output: {
      file: 'dist/client.browser.js',
      format: 'umd',
      name: 'PowShield',
      exports: 'named'
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({ 
        tsconfig: './rollup.tsconfig.json',
        tslib: require.resolve('tslib')
      }),
      terser()
    ]
  },
  // Full browser bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser.js',
      format: 'umd',
      name: 'PowShield',
      exports: 'named'
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({ 
        tsconfig: './rollup.tsconfig.json',
        tslib: require.resolve('tslib')
      }),
      terser()
    ]
  }
];