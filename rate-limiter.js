// Rate Limiter Service
// Prevents API abuse by limiting requests per user per time window

class RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.clients = new Map();
    }

    isAllowed(clientId) {
        const now = Date.now();
        const clientData = this.clients.get(clientId);

        if (!clientData) {
            this.clients.set(clientId, { count: 1, windowStart: now });
            return { allowed: true, remaining: this.maxRequests - 1 };
        }

        if (now - clientData.windowStart > this.windowMs) {
            clientData.count = 1;
            clientData.windowStart = now;
            return { allowed: true, remaining: this.maxRequests - 1 };
        }

        if (clientData.count >= this.maxRequests) {
            const retryAfter = Math.ceil((clientData.windowStart + this.windowMs - now) / 1000);
            return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
        }

        clientData.count++;
        return { allowed: true, remaining: this.maxRequests - clientData.count };
    }

    getClientStats(clientId) {
        const data = this.clients.get(clientId);
        if (!data) return { requests: 0, limit: this.maxRequests };
        return {
            requests: data.count,
            limit: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - data.count),
            windowResetMs: data.windowStart + this.windowMs - Date.now()
        };
    }

    resetClient(clientId) {
        this.clients.delete(clientId);
    }

    resetAll() {
        this.clients.clear();
    }
}

module.exports = RateLimiter;