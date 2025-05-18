import { CryptoUtils } from '../src/utils/crypto';

describe('CryptoUtils', () => {
  describe('sha256', () => {
    it('should generate consistent hashes', () => {
      const input = 'test-data';
      const hash1 = CryptoUtils.sha256(input);
      const hash2 = CryptoUtils.sha256(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 character hex string
    });
  });

  describe('hmac', () => {
    it('should generate valid HMAC signatures', () => {
      const data = 'test-data';
      const secret = 'test-secret';
      
      const hmac256 = CryptoUtils.hmac(data, secret, 'sha256');
      const hmac512 = CryptoUtils.hmac(data, secret, 'sha512');
      
      expect(hmac256.length).toBe(64); // SHA-256 produces 64 character hex string
      expect(hmac512.length).toBe(128); // SHA-512 produces 128 character hex string
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = CryptoUtils.generateNonce();
      const nonce2 = CryptoUtils.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(0);
    });
  });

  describe('hasLeadingZeros', () => {
    it('should correctly validate leading zeros', () => {
      // Each hex digit represents 4 bits
      // '0' in hex = '0000' in binary
      
      // Hash with exactly 8 leading zero bits (2 hex digits = '00')
      const hash1 = '00ff3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Hash with exactly 12 leading zero bits (3 hex digits = '000')
      const hash2 = '000ff3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Hash with exactly 16 leading zero bits (4 hex digits = '0000')
      const hash3 = '0000f3bce7220a4acf0af32e90862f3dcce7a2569c1f92147809dc1a';
      
      // Correct expectations:
      // For hash1 ('00' prefix):
      expect(CryptoUtils.hasLeadingZeros(hash1, 8)).toBe(true);    // Should pass (has 8 zero bits)
      expect(CryptoUtils.hasLeadingZeros(hash1, 9)).toBe(false);   // Should fail (only has 8 bits)
      
      // For hash2 ('000' prefix):
      expect(CryptoUtils.hasLeadingZeros(hash2, 8)).toBe(true);    // Should pass (has 12 zero bits)
      expect(CryptoUtils.hasLeadingZeros(hash2, 12)).toBe(true);   // Should pass (has 12 zero bits)
      expect(CryptoUtils.hasLeadingZeros(hash2, 13)).toBe(false);  // Should fail (only has 12 bits)
      
      // For hash3 ('0000' prefix):
      expect(CryptoUtils.hasLeadingZeros(hash3, 12)).toBe(true);   // Should pass (has 16 zero bits)
      expect(CryptoUtils.hasLeadingZeros(hash3, 16)).toBe(true);   // Should pass (has 16 zero bits)
      expect(CryptoUtils.hasLeadingZeros(hash3, 17)).toBe(false);  // Should fail (only has 16 bits)
    });
  });

  describe('generateContext', () => {
    it('should generate context based on user agent', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const context = CryptoUtils.generateContext(userAgent);
      
      expect(context.length).toBe(64); // SHA-256 produces 64 character hex string
    });

    it('should include IP when using ip+userAgent method', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const ip = '192.168.1.1';
      
      const contextUa = CryptoUtils.generateContext(userAgent, undefined, 'userAgent');
      const contextIpUa = CryptoUtils.generateContext(userAgent, ip, 'ip+userAgent');
      
      expect(contextUa).not.toBe(contextIpUa);
    });
  });
});