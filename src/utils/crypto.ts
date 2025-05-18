import CryptoJS from 'crypto-js';

/**
 * Utility class for cryptographic operations
 */
export class CryptoUtils {
  /**
   * Generates a SHA-256 hash of the input
   * @param data Input data
   * @returns Hex-encoded hash
   */
  static sha256(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  /**
   * Generates an HMAC signature
   * @param data Data to sign
   * @param secret Secret key
   * @param algorithm HMAC algorithm to use (sha256 or sha512)
   * @returns Hex-encoded HMAC signature
   */
  static hmac(data: string, secret: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    if (algorithm === 'sha256') {
      return CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
    } else {
      return CryptoJS.HmacSHA512(data, secret).toString(CryptoJS.enc.Hex);
    }
  }

  /**
   * Generates a random nonce
   * @returns Random hexadecimal string
   */
  static generateNonce(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return randomBytes.toString(CryptoJS.enc.Hex);
  }

  /**
   * Checks if a hash has a specified number of leading zero bits
   * @param hash Hex-encoded hash
   * @param difficulty Number of leading zero bits required
   * @returns True if the hash has the required number of leading zero bits
   */
  static hasLeadingZeros(hash: string, difficulty: number): boolean {
    // Convert to binary string
    let binary = '';
    for (let i = 0; i < hash.length; i++) {
      const nibble = parseInt(hash[i], 16).toString(2).padStart(4, '0');
      binary += nibble;
    }
    
    // Check for leading zeros
    for (let i = 0; i < difficulty; i++) {
      if (binary[i] !== '0') {
        return false;
      }
    }
    return true;
  }

  /**
   * Generates a context based on the user agent and/or IP
   * @param userAgent User agent string
   * @param ip IP address (optional)
   * @param method Context generation method
   * @returns Context hash
   */
  static generateContext(
    userAgent: string,
    ip?: string,
    method: 'userAgent' | 'ip+userAgent' | 'custom' = 'userAgent'
  ): string {
    switch (method) {
      case 'userAgent':
        return this.sha256(userAgent);
      case 'ip+userAgent':
        return this.sha256(`${ip || ''}:${userAgent}`);
      case 'custom':
        // For custom implementations
        return this.sha256(userAgent);
      default:
        return this.sha256(userAgent);
    }
  }
}