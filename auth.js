async function handleGoogleLogin() {
    const btn = document.querySelector('.google-btn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="display:block; border-color:#333; border-top-color:transparent;"></div> Connecting...';

    try {
        const user = await FB.googleLogin();
        showToast("Welcome " + user.name + "!");
        setTimeout(() => { window.location.href = '/home.html'; }, 500);
    } catch (error) {
        console.error("Google Login FAILED:", error);
        showToast("Error: " + error.message, "error");
    }

    btn.disabled = false;
    btn.innerHTML = originalHTML;
}
window.handleGoogleLogin = handleGoogleLogin;
