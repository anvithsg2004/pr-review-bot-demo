// User Profile Module
function getUserProfile(userId) {
    return {
        id: userId,
        name: "Demo User",
        email: "demo@example.com",
        role: "developer"
    };
}

function updateProfile(userId, data) {
    console.log(`Updating profile for ${userId}`);
    return { success: true };
}

module.exports = { getUserProfile, updateProfile };