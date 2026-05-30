// ================================================
// AUTH - Sirf Google se Login / Sign Up
// ================================================

async function handleGoogleLogin() {
    const btn = document.querySelector('.google-btn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="display:block; border-color:#333; border-top-color:transparent;"></div> Connecting...';

    try {
        console.log("Step 1: Opening Google popup...");
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        console.log("Step 2: Google login success, user:", user.email);

        const idToken = await user.getIdToken();
        console.log("Step 3: Got ID token");

        console.log("Step 4: Sending to backend...");
        const response = await fetch(API_BASE + '/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });

        console.log("Step 5: Backend response status:", response.status);
        const data = await response.json();
        console.log("Step 6: Backend data:", data);

        if (!response.ok) {
            throw new Error(data.error || 'Backend error');
        }

        localStorage.setItem("arena_token", data.token);
        localStorage.setItem("arena_user", JSON.stringify(data.user));
        console.log("Step 7: Token saved to localStorage");

        showToast("Welcome " + data.user.name + "!");
        console.log("Step 8: Redirecting to home...");

        setTimeout(() => {
            console.log("Step 9: Actually redirecting now...");
            window.location.href = '/user/home.html';
        }, 500);

    } catch (error) {
        console.error("Google Login FAILED:", error);
        showToast("Error: " + error.message, "error");
    }

    btn.disabled = false;
    btn.innerHTML = originalHTML;
}
window.handleGoogleLogin = handleGoogleLogin;
