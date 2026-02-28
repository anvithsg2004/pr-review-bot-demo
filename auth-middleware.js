// Authentication Middleware
class AuthMiddleware {
    constructor(secretKey) {
        this.secretKey = secretKey;
        this.sessions = new Map();
    }

    createSession(userId, role) {
        const token = this.generateToken();
        this.sessions.set(token, {
            userId,
            role,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000
        });
        return token;
    }

    validateRequest(token) {
        const session = this.sessions.get(token);
        if (!session) return { valid: false, reason: 'Invalid token' };
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            return { valid: false, reason: 'Token expired' };
        }
        return { valid: true, userId: session.userId, role: session.role };
    }

    requireRole(token, requiredRole) {
        const result = this.validateRequest(token);
        if (!result.valid) return result;
        if (result.role !== requiredRole) {
            return { valid: false, reason: 'Insufficient permissions' };
        }
        return result;
    }

    revokeSession(token) {
        return this.sessions.delete(token);
    }

    generateToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

module.exports = AuthMiddleware;