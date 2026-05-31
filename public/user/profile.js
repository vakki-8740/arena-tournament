async function initProfileData() {
    if(!window.userToken) return;

    try {
        const user = await apiFetch('/api/auth/user');
        window.userProfileName = user.name;
        window.userAvatarUrl = user.avatar || "";
        window.userFfName = user.ff_name || "";
        window.userFfUid = user.ff_uid || "";

        const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };

        set('p-name', user.name);
        set('p-uid', user.phone || 'Google User');
        setVal('ep-name', user.name);
        set('p-ffname', window.userFfName || 'Not Set');
        set('p-ffuid', window.userFfUid || 'Not Set');
        setVal('ep-ffname', window.userFfName);
        setVal('ep-ffuid', window.userFfUid);
        document.getElementById('p-img').style.backgroundImage = `url('${window.userAvatarUrl}')`;
    } catch(e) {}

    try {
        const txs = await apiFetch('/api/transactions');
        let totalDep = 0, totalWit = 0, totalWinAmt = 0, totalWins = 0;
        txs.forEach(tx => {
            if(tx.status === 'Success') {
                if(tx.type === 'Deposit') totalDep += Number(tx.amount);
                if(tx.type === 'Withdraw') totalWit += Number(tx.amount);
                if(tx.type === 'Win') { totalWinAmt += Number(tx.amount); totalWins++; }
            }
        });
        const s = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        s('p-stat-dep', '₹' + totalDep); s('p-stat-wit', '₹' + totalWit);
        s('p-stat-earn', '₹' + totalWinAmt); s('p-stat-win', totalWins);
    } catch(e) {}

    try { window.adminSettings = await fsGetSettings(); } catch(e) {}
}

async function saveProfile(btn) {
    const name = document.getElementById('ep-name').value;
    const ffName = document.getElementById('ep-ffname').value;
    const ffUid = document.getElementById('ep-ffuid').value;
    if(!name) { showToast("Name is required", "error"); return; }
    btnLoading(btn, true);
    try {
        await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ name, ffName, ffUid }) });
        showToast("Profile Updated!");
        btnLoading(btn, false); forceCloseModal('edit-profile-modal');
        initProfileData();
    } catch(e) { showToast("Update Failed", "error"); }
    btnLoading(btn, false);
}
window.saveProfile = saveProfile;

// ==================== AVATAR UPLOAD + CROP ====================

let cropImageSrc = null;
let cropPosX = 0;
let cropPosY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startPosX = 0;
let startPosY = 0;

function uploadAvatar(input) {
    const file = input.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) {
        showToast("Image must be under 5MB!", "error");
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        cropImageSrc = e.target.result;
        cropPosX = 0;
        cropPosY = 0;
        openCropModal();
    };
    reader.readAsDataURL(file);
    input.value = '';
}
window.uploadAvatar = uploadAvatar;

function openCropModal() {
    const modal = document.getElementById('crop-modal');
    const img = document.getElementById('crop-image');
    img.src = cropImageSrc;
    cropPosX = 0;
    cropPosY = 0;
    updateImagePosition();
    modal.classList.add('active');

    // Drag handlers
    const circle = document.getElementById('crop-circle');

    function onStart(e) {
        isDragging = true;
        const point = e.touches ? e.touches[0] : e;
        dragStartX = point.clientX;
        dragStartY = point.clientY;
        startPosX = cropPosX;
        startPosY = cropPosY;
    }

    function onMove(e) {
        if(!isDragging) return;
        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;
        const dx = point.clientX - dragStartX;
        const dy = point.clientY - dragStartY;
        cropPosX = startPosX + dx;
        cropPosY = startPosY + dy;
        updateImagePosition();
    }

    function onEnd() { isDragging = false; }

    // Pehle listeners hatao
    circle.onmousedown = null;
    circle.ontouchstart = null;
    document.onmousemove = null;
    document.ontouchmove = null;
    document.onmouseup = null;
    document.ontouchend = null;

    circle.onmousedown = onStart;
    circle.ontouchstart = onStart;
    document.onmousemove = onMove;
    document.ontouchmove = onMove;
    document.onmouseup = onEnd;
    document.ontouchend = onEnd;
}

function updateImagePosition() {
    const img = document.getElementById('crop-image');
    if(img) {
        img.style.transform = `translate(${cropPosX}px, ${cropPosY}px)`;
    }
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('active');
    cropImageSrc = null;
    isDragging = false;
    document.onmousemove = null;
    document.ontouchmove = null;
    document.onmouseup = null;
    document.ontouchend = null;
}
window.closeCropModal = closeCropModal;

async function saveCroppedImage() {
    const img = document.getElementById('crop-image');
    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Black circle background
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.clip();

    // Image draw karo with position offset
    const containerSize = 280;
    const scale = size / containerSize;
    const imgNaturalW = img.naturalWidth;
    const imgNaturalH = img.naturalHeight;

    // Image ko container mein fit karo
    const fitScale = Math.max(size / imgNaturalW, size / imgNaturalH);
    const drawW = imgNaturalW * fitScale;
    const drawH = imgNaturalH * fitScale;
    const drawX = (size - drawW) / 2 + (cropPosX * scale);
    const drawY = (size - drawH) / 2 + (cropPosY * scale);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);

    showToast("Uploading...");
    try {
        await apiFetch('/api/auth/avatar', {
            method: 'PUT',
            body: JSON.stringify({ avatar: croppedBase64 })
        });

        document.getElementById('p-img').style.backgroundImage = `url('${croppedBase64}')`;
        const headerAvatar = document.getElementById('user-avatar-header');
        if(headerAvatar) headerAvatar.style.backgroundImage = `url('${croppedBase64}')`;

        const savedUser = JSON.parse(localStorage.getItem('arena_user') || '{}');
        savedUser.avatar = croppedBase64;
        localStorage.setItem('arena_user', JSON.stringify(savedUser));

        closeCropModal();
        showToast("Photo updated!");
    } catch(e) {
        showToast("Upload failed: " + e.message, "error");
    }
}
window.saveCroppedImage = saveCroppedImage;

function openAdminLink(type) {
    let url = "";
    if(type === 'telegram') url = window.adminSettings?.telegram;
    if(type === 'help') url = window.adminSettings?.help;
    if(url && url.trim() !== "") window.open(url, '_blank');
    else showToast("Link not updated by admin yet!", "error");
}
window.openAdminLink = openAdminLink;

function confirmLogout() {
    if(confirm("Are you sure you want to logout?")) {
        logoutUser();
    }
}
window.confirmLogout = confirmLogout;

document.addEventListener('DOMContentLoaded', () => {
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadHeader();
        initProfileData();
    } else { window.location.href = '/home.html'; }
});
