import { CryptoUtils } from '../src/utils/crypto';
import * as CryptoJS from 'crypto-js';

// Do NOT mock CryptoUtils or CryptoJS - use the real implementations

describe('CryptoUtils', () => {
  describe('sha256', () => {
    it('should generate consistent hashes', () => {
      const input = 'test-data';
      const hash1 = CryptoUtils.sha256(input);
      const hash2 = CryptoUtils.sha256(input);
      
      // Verify consistency
      expect(hash1).toBe(hash2);
      
      // Verify correct length for SHA-256 (64 hex chars)
      expect(hash1.length).toBe(64);
      
      // Verify against known hash value
      const knownHash = CryptoJS.SHA256('test-data').toString(CryptoJS.enc.Hex);
      expect(hash1).toBe(knownHash);
    });
  });

  describe('hmac', () => {
    it('should generate valid HMAC signatures', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      
      // Test SHA-256 HMAC
      const hmac256 = CryptoUtils.hmac(data, secret, 'sha256');
      const knownHmac256 = CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
      expect(hmac256).toBe(knownHmac256);
      expect(hmac256.length).toBe(64);
      
      // Test SHA-512 HMAC
      const hmac512 = CryptoUtils.hmac(data, secret, 'sha512');
      const knownHmac512 = CryptoJS.HmacSHA512(data, secret).toString(CryptoJS.enc.Hex);
      expect(hmac512).toBe(knownHmac512);
      expect(hmac512.length).toBe(128);
    });
    
    it('should use sha256 as default algorithm', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      
      const hmacDefault = CryptoUtils.hmac(data, secret);
      const hmacSha256 = CryptoUtils.hmac(data, secret, 'sha256');
      
      expect(hmacDefault).toBe(hmacSha256);
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces of correct length', () => {
      const nonce1 = CryptoUtils.generateNonce();
      const nonce2 = CryptoUtils.generateNonce();
      
      // Verify uniqueness
      expect(nonce1).not.toBe(nonce2);
      
      // Verify length (16 random bytes = 32 hex chars)
      expect(nonce1.length).toBe(32);
      expect(nonce2.length).toBe(32);
      
      // Verify it's valid hex
      expect(nonce1).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('hasLeadingZeros', () => {
    it('should correctly validate leading zeros', () => {
      // Create hashes with specific patterns of leading zeros
      
      // Hash with exactly 8 leading zero bits (2 hex digits = '00')
      const hash1 = '00ff3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Hash with exactly 12 leading zero bits (3 hex digits = '000')
      const hash2 = '000ff3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Hash with exactly 16 leading zero bits (4 hex digits = '0000')
      const hash3 = '0000f3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Verify at least N leading zeros
      // For hash1 ('00' prefix = 8 bits):
      expect(CryptoUtils.hasLeadingZeros(hash1, 7)).toBe(true);   // Less than available
      expect(CryptoUtils.hasLeadingZeros(hash1, 8)).toBe(true);   // Exactly available
      expect(CryptoUtils.hasLeadingZeros(hash1, 9)).toBe(false);  // More than available
      
      // For hash2 ('000' prefix = 12 bits):
      expect(CryptoUtils.hasLeadingZeros(hash2, 8)).toBe(true);    // Less than available
      expect(CryptoUtils.hasLeadingZeros(hash2, 12)).toBe(true);   // Exactly available
      expect(CryptoUtils.hasLeadingZeros(hash2, 13)).toBe(false);  // More than available
      
      // For hash3 ('0000' prefix = 16 bits):
      expect(CryptoUtils.hasLeadingZeros(hash3, 12)).toBe(true);   // Less than available
      expect(CryptoUtils.hasLeadingZeros(hash3, 16)).toBe(true);   // Exactly available
      expect(CryptoUtils.hasLeadingZeros(hash3, 17)).toBe(false);  // More than available
      
      // Edge cases
      expect(CryptoUtils.hasLeadingZeros('', 0)).toBe(true);       // Empty hash, zero difficulty
      expect(CryptoUtils.hasLeadingZeros('', 1)).toBe(false);      // Empty hash, non-zero difficulty
      expect(CryptoUtils.hasLeadingZeros('abcdef', 0)).toBe(true); // No zeros needed
      expect(CryptoUtils.hasLeadingZeros('abcdef', 1)).toBe(false); // No leading zeros
    });
    
    it('should handle real hash scenarios', () => {
      // Generate actual hashes with crypto library
      const hash1 = CryptoJS.SHA256('test-value').toString(CryptoJS.enc.Hex);
      
      // Calculate actual leading zeros by inspection
      let binaryHash = '';
      for (let i = 0; i < hash1.length; i++) {
        binaryHash += parseInt(hash1[i], 16).toString(2).padStart(4, '0');
        if (binaryHash.indexOf('1') !== -1) break;
      }
      
      const actualLeadingZeros = binaryHash.indexOf('1');
      
      // Verify our function matches the actual number
      expect(CryptoUtils.hasLeadingZeros(hash1, actualLeadingZeros)).toBe(true);
      expect(CryptoUtils.hasLeadingZeros(hash1, actualLeadingZeros + 1)).toBe(false);
    });
  });

  describe('generateContext', () => {
    it('should generate consistent context hashes', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      
      // Test consistency
      const context1 = CryptoUtils.generateContext(userAgent);
      const context2 = CryptoUtils.generateContext(userAgent);
      expect(context1).toBe(context2);
      
      // Verify it's a SHA-256 hash (64 hex chars)
      expect(context1.length).toBe(64);
      
      // Verify against known hash
      const knownHash = CryptoJS.SHA256(userAgent).toString(CryptoJS.enc.Hex);
      expect(context1).toBe(knownHash);
    });

    it('should handle different context generation methods', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const ip = '192.168.1.1';
      
      // Test userAgent method
      const contextUa = CryptoUtils.generateContext(userAgent, undefined, 'userAgent');
      const expectedUaHash = CryptoJS.SHA256(userAgent).toString(CryptoJS.enc.Hex);
      expect(contextUa).toBe(expectedUaHash);
      
      // Test ip+userAgent method
      const contextIpUa = CryptoUtils.generateContext(userAgent, ip, 'ip+userAgent');
      const expectedIpUaHash = CryptoJS.SHA256(`${ip}:${userAgent}`).toString(CryptoJS.enc.Hex);
      expect(contextIpUa).toBe(expectedIpUaHash);
      
      // Verify they're different
      expect(contextUa).not.toBe(contextIpUa);
      
      // Test custom method
      const contextCustom = CryptoUtils.generateContext(userAgent, ip, 'custom');
      expect(contextCustom).toBe(expectedUaHash); // Should match userAgent method
    });
  });
});