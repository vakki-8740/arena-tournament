const API_BASE = 'https://arena-tournament-s7ne.onrender.com';

// Session check
window.userToken = localStorage.getItem("arena_token");
const savedUser = localStorage.getItem("arena_user");
window.loggedInPhone = savedUser ? JSON.parse(savedUser).phone : null;
window.loggedInUserId = savedUser ? JSON.parse(savedUser).id : null;
window.userProfileName = "Arena Player";
window.userAvatarUrl = "";
window.userFfName = "";
window.userFfUid = "";
window.userBalance = 0;
window.userSavedUpi = null;
window.userSavedBank = null;
window.adminSettings = {};

window.addEventListener('offline', () => {
    const el = document.getElementById('offline-popup');
    if(el) el.classList.add('show');
});
window.addEventListener('online', () => {
    const el = document.getElementById('offline-popup');
    if(el) el.classList.remove('show');
});

async function apiFetch(url, options = {}) {
    const token = window.userToken || localStorage.getItem('arena_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}
window.apiFetch = apiFetch;

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.innerText = msg;
    toast.style.background = type === "error" ? "rgba(255, 59, 48, 0.95)" : "rgba(52, 199, 89, 0.95)";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}
window.showToast = showToast;

function btnLoading(btn, isLoading) {
    const textSpan = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    if (isLoading) { btn.disabled = true; textSpan.style.display = 'none'; spinner.style.display = 'block'; }
    else { btn.disabled = false; textSpan.style.display = 'block'; spinner.style.display = 'none'; }
}
window.btnLoading = btnLoading;

function openModal(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = 'flex';
}
window.openModal = openModal;

function closeModal(event, id) {
    if(event.target.id === id) {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    }
}
window.closeModal = closeModal;

function forceCloseModal(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
}
window.forceCloseModal = forceCloseModal;

function logoutUser() {
    localStorage.removeItem("arena_phone");
    localStorage.removeItem("arena_token");
    localStorage.removeItem("arena_user");
    window.userToken = null;
    window.loggedInPhone = null;
    window.loggedInUserId = null;
    window.location.href = '/user/home.html';
}
window.logoutUser = logoutUser;

function formatOnlyTime(dateString) {
    if(!dateString) return "TBA";
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
window.formatOnlyTime = formatOnlyTime;

// Page navigate with loading animation
function navigateTo(page) {
    const overlay = document.getElementById('page-transition');
    if(overlay) {
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = page; }, 800);
    } else {
        window.location.href = page;
    }
}
window.navigateTo = navigateTo;

// Apply saved theme on every page
(function() {
    const savedTheme = localStorage.getItem('arena_theme') || 'light';
    if(savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
    }
})();

// Load header - App logo, name, user avatar
async function loadHeader() {
    try {
        const settings = await apiFetch('/api/settings');
        if(settings.appLogo) {
            const img = document.getElementById('header-app-logo-img');
            const txt = document.getElementById('header-app-logo-text');
            if(img) { img.src = settings.appLogo; img.style.display = 'block'; }
            if(txt) txt.style.display = 'none';
        }
        if(settings.appName) {
            const el = document.getElementById('header-app-name');
            if(el) el.innerText = settings.appName;
        }
    } catch(e) {}
    try {
        const user = await apiFetch('/api/auth/user');
        const avatarEl = document.getElementById('user-avatar-header');
        if(avatarEl) {
            if(user.avatar) {
                avatarEl.style.background = `url('${user.avatar}') center/cover no-repeat`;
                avatarEl.innerHTML = '';
            } else {
                avatarEl.style.background = 'linear-gradient(135deg, var(--primary), #34aeff)';
                avatarEl.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
        // Set header balance
        const headerBal = document.getElementById('header-bal');
        if(headerBal) headerBal.innerText = user.balance || 0;
    } catch(e) {}
}
window.loadHeader = loadHeader;

// Copy text to clipboard
function copyText(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied!");
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast("Copied!");
    });
}
window.copyText = copyText;
