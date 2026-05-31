// Dark Mode Toggle
function toggleDarkMode() {
    const isDark = document.getElementById('dark-mode-toggle').checked;
    if(isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('arena_theme', 'dark');
        document.body.style.backgroundColor = '#121212';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('arena_theme', 'light');
        document.body.style.backgroundColor = '#e5e5ea';
    }
}
window.toggleDarkMode = toggleDarkMode;

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('arena_theme') || 'light';
    const toggle = document.getElementById('dark-mode-toggle');
    if(savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = '#121212';
        if(toggle) toggle.checked = true;
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.style.backgroundColor = '#e5e5ea';
        if(toggle) toggle.checked = false;
    }
}

// Clear cache
function clearCache() {
    if(confirm("Clear all app data and reload?")) {
        localStorage.removeItem('arena_token');
        localStorage.removeItem('arena_user');
        localStorage.removeItem('arena_theme');
        window.location.href = '/home.html';
    }
}
window.clearCache = clearCache;

// Confirm logout
function confirmLogout() {
    if(confirm("Are you sure you want to logout?")) {
        logoutUser();
    }
}
window.confirmLogout = confirmLogout;

// Open admin links
function openAdminLink(type) {
    let url = "";
    if(type === 'telegram') url = window.adminSettings?.telegram;
    if(type === 'help') url = window.adminSettings?.help;
    if(url && url.trim() !== "") window.open(url, '_blank');
    else showToast("Link not updated by admin yet!", "error");
}
window.openAdminLink = openAdminLink;

// Load admin settings
async function loadSettings() {
    try {
        const settings = await fsGetSettings();
        window.adminSettings = settings;
    } catch(e) {}
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadTheme();
        loadHeader();
        loadSettings();
    } else {
        window.location.href = '/home.html';
    }
});
