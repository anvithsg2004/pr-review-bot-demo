// Email Notification Service
function sendWelcomeEmail(userEmail, userName) {
    console.log(`Sending welcome email to ${userName} at ${userEmail}`);
    return { sent: true, template: "welcome", timestamp: Date.now() };
}

function sendPasswordReset(userEmail, resetToken) {
    console.log(`Password reset email sent to ${userEmail}`);
    return { sent: true, token: resetToken, expiresIn: "15 minutes" };
}

function sendWeeklyDigest(userEmail, stats) {
    const digest = {
        totalPRs: stats.total,
        reviewed: stats.reviewed,
        pending: stats.pending,
        avgTime: stats.avgReviewTime
    };
    console.log(`Weekly digest sent to ${userEmail}`);
    return { sent: true, digest };
}

module.exports = { sendWelcomeEmail, sendPasswordReset, sendWeeklyDigest };