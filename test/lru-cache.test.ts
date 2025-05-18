import { LRUCache } from 'lru-cache';

describe('LRU Cache', () => {
  let cache: LRUCache<string, any>;
  
  beforeEach(() => {
    // Create a real LRU cache with test configuration
    cache = new LRUCache({
      max: 10,
      ttl: 50 // 50ms TTL for testing expiry
    });
  });
  
  it('should store and retrieve values', () => {
    // Set some values
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    // Retrieve them
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('nonexistent')).toBeUndefined();
  });
  
  it('should handle max size limit', () => {
    // Fill the cache beyond its max size
    for (let i = 0; i < 15; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    // Early items should be evicted
    expect(cache.get('key0')).toBeUndefined();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBeUndefined();
    expect(cache.get('key4')).toBeUndefined();
    
    // Later items should still be present
    expect(cache.get('key14')).toBe('value14');
    expect(cache.get('key10')).toBe('value10');
  });
  
  it('should respect TTL settings', async () => {
    cache.set('expiring', 'value', { ttl: 20 }); // 20ms TTL
    
    // Should be available immediately
    expect(cache.get('expiring')).toBe('value');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Should be gone now
    expect(cache.get('expiring')).toBeUndefined();
  });
  
  it('should handle boolean values correctly', () => {
    cache.set('truthy', true);
    cache.set('falsy', false);
    
    expect(cache.get('truthy')).toBe(true);
    expect(cache.get('falsy')).toBe(false);
    
    // Check has() works too
    expect(cache.has('truthy')).toBe(true);
    expect(cache.has('falsy')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });
  
  it('should handle different value types', () => {
    // Test with various value types
    cache.set('string', 'hello');
    cache.set('number', 123);
    cache.set('boolean', true);
    cache.set('object', { key: 'value' });
    cache.set('array', [1, 2, 3]);
    
    expect(cache.get('string')).toBe('hello');
    expect(cache.get('number')).toBe(123);
    expect(cache.get('boolean')).toBe(true);
    expect(cache.get('object')).toEqual({ key: 'value' });
    expect(cache.get('array')).toEqual([1, 2, 3]);
  });
});