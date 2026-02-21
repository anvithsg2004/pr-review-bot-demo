// Payment Processing Module
function processPayment(amount, currency) {
    console.log(`Processing ${currency} ${amount}`);
    return { status: "success", transactionId: "TXN-001" };
}

function refundPayment(transactionId) {
    console.log(`Refunding: ${transactionId}`);
    return { status: "refunded" };
}

module.exports = { processPayment, refundPayment };