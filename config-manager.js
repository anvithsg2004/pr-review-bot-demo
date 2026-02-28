// Configuration Manager
class ConfigManager {
    constructor() {
        this.config = new Map();
        this.defaults = new Map();
    }

    setDefault(key, value) {
        this.defaults.set(key, value);
    }

    set(key, value) {
        this.config.set(key, value);
    }

    get(key) {
        if (this.config.has(key)) return this.config.get(key);
        if (this.defaults.has(key)) return this.defaults.get(key);
        return undefined;
    }

    getAll() {
        const all = {};
        for (const [k, v] of this.defaults) all[k] = v;
        for (const [k, v] of this.config) all[k] = v;
        return all;
    }
}

module.exports = ConfigManager;