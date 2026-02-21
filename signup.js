function signupUser(email, password, name) {
    console.log(`Creating account for: ${name}`);
    return { success: true, userId: "user-001" };
}

module.exports = { signupUser };