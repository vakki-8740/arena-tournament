const API_BASE = '';

window.userToken = null;
window.loggedInUserId = null;
window.userBalance = 0;

window.addEventListener('offline', () => {
    const el = document.getElementById('offline-popup');
    if(el) el.classList.add('show');
});
window.addEventListener('online', () => {
    const el = document.getElementById('offline-popup');
    if(el) el.classList.remove('show');
});

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
    FB.logout();
    window.location.href = '/home.html';
}
window.logoutUser = logoutUser;

function formatOnlyTime(dateString) {
    if(!dateString) return "TBA";
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
window.formatOnlyTime = formatOnlyTime;

function navigateTo(page) {
    window.location.href = '/' + page;
}
window.navigateTo = navigateTo;

(function() {
    const savedTheme = localStorage.getItem('arena_theme') || 'light';
    if(savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
    }
})();

async function loadHeader() {
    try {
        const settings = await FB.getSettings();
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
        const uid = FB.getCurrentUid();
        if (!uid) return;
        const user = await FB.getUser(uid);
        if (!user) return;
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
        const headerBal = document.getElementById('header-bal');
        if(headerBal) headerBal.innerText = user.balance || 0;
        window.userBalance = user.balance || 0;
    } catch(e) {}
}
window.loadHeader = loadHeader;

function copyText(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied!");
    }).catch(() => {
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
