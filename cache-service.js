// Cache Service with TTL Support
class CacheService {
    constructor(defaultTTL = 300) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    set(key, value, ttl) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
        this.cache.set(key, { value, expiresAt });
        return true;
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    clear() {
        this.cache.clear();
    }
}

module.exports = CacheService;