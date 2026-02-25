// Inventory Management Service
class InventoryService {
    constructor() {
        this.products = new Map();
    }

    addProduct(productId, name, quantity, price) {
        this.products.set(productId, {
            id: productId,
            name: name,
            quantity: quantity,
            price: price,
            lastUpdated: new Date().toISOString()
        });
        console.log(`Product added: ${name} (${quantity} units)`);
        return this.products.get(productId);
    }

    getStock(productId) {
        const product = this.products.get(productId);
        if (!product) throw new Error(`Product ${productId} not found`);
        return product.quantity;
    }

    updateStock(productId, quantityChange) {
        const product = this.products.get(productId);
        if (!product) throw new Error(`Product ${productId} not found`);
        product.quantity += quantityChange;
        product.lastUpdated = new Date().toISOString();
        if (product.quantity < 0) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
        console.log(`Stock updated: ${product.name} → ${product.quantity} units`);
        return product;
    }

    getLowStockItems(threshold) {
        const lowStock = [];
        for (const [id, product] of this.products) {
            if (product.quantity <= threshold) {
                lowStock.push(product);
            }
        }
        return lowStock;
    }

    getInventoryReport() {
        const report = {
            totalProducts: this.products.size,
            totalValue: 0,
            items: []
        };
        for (const [id, product] of this.products) {
            report.totalValue += product.price * product.quantity;
            report.items.push(product);
        }
        return report;
    }
}

module.exports = InventoryService;