async function initProfileData() {
    var uid = FB.getCurrentUid();
    if(!uid) return;
    try {
        var user = await FB.getUser(uid);
        window.userProfileName = user.name;
        window.userAvatarUrl = user.avatar || "";
        window.userFfName = user.ff_name || "";
        window.userFfUid = user.ff_uid || "";
        var set = function(id, val) { var el = document.getElementById(id); if(el) el.innerText = val; };
        var setVal = function(id, val) { var el = document.getElementById(id); if(el) el.value = val; };
        set('p-name', user.name);
        set('p-uid', user.phone || 'Google User');
        setVal('ep-name', user.name);
        set('p-ffname', window.userFfName || 'Not Set');
        set('p-ffuid', window.userFfUid || 'Not Set');
        setVal('ep-ffname', window.userFfName);
        setVal('ep-ffuid', window.userFfUid);
        document.getElementById('p-img').style.backgroundImage = "url('" + window.userAvatarUrl + "')";
    } catch(e) {}
    try {
        var txs = await FB.getTransactions(FB.getCurrentUid());
        var totalDep = 0, totalWit = 0, totalWinAmt = 0, totalWins = 0;
        txs.forEach(function(tx) { if(tx.status === 'Success') { if(tx.type === 'Deposit') totalDep += Number(tx.amount); if(tx.type === 'Withdraw') totalWit += Number(tx.amount); if(tx.type === 'Win') { totalWinAmt += Number(tx.amount); totalWins++; } } });
        var s = function(id, val) { var el = document.getElementById(id); if(el) el.innerText = val; };
        s('p-stat-dep', '₹' + totalDep); s('p-stat-wit', '₹' + totalWit);
        s('p-stat-earn', '₹' + totalWinAmt); s('p-stat-win', totalWins);
    } catch(e) {}
    try { window.adminSettings = await FB.getSettings(); } catch(e) {}
}

async function saveProfile(btn) {
    var name = document.getElementById('ep-name').value;
    var ffName = document.getElementById('ep-ffname').value;
    var ffUid = document.getElementById('ep-ffuid').value;
    if(!name) { showToast("Name is required", "error"); return; }
    btnLoading(btn, true);
    try {
        await FB.updateUser(FB.getCurrentUid(), { name: name, ff_name: ffName, ff_uid: ffUid });
        showToast("Profile Updated!");
        btnLoading(btn, false); forceCloseModal('edit-profile-modal');
        initProfileData();
    } catch(e) { showToast("Update Failed", "error"); }
    btnLoading(btn, false);
}
window.saveProfile = saveProfile;

var cropImageSrc = null, cropPosX = 0, cropPosY = 0, isDragging = false, dragStartX = 0, dragStartY = 0, startPosX = 0, startPosY = 0;

function uploadAvatar(input) {
    var file = input.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB!", "error"); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(e) { cropImageSrc = e.target.result; cropPosX = 0; cropPosY = 0; openCropModal(); };
    reader.readAsDataURL(file);
    input.value = '';
}
window.uploadAvatar = uploadAvatar;

function openCropModal() {
    var modal = document.getElementById('crop-modal');
    var img = document.getElementById('crop-image');
    img.src = cropImageSrc;
    cropPosX = 0; cropPosY = 0;
    updateImagePosition();
    modal.classList.add('active');
    var circle = document.getElementById('crop-circle');
    function onStart(e) { isDragging = true; var point = e.touches ? e.touches[0] : e; dragStartX = point.clientX; dragStartY = point.clientY; startPosX = cropPosX; startPosY = cropPosY; }
    function onMove(e) { if(!isDragging) return; e.preventDefault(); var point = e.touches ? e.touches[0] : e; cropPosX = startPosX + (point.clientX - dragStartX); cropPosY = startPosY + (point.clientY - dragStartY); updateImagePosition(); }
    function onEnd() { isDragging = false; }
    circle.onmousedown = null; circle.ontouchstart = null; document.onmousemove = null; document.ontouchmove = null; document.onmouseup = null; document.ontouchend = null;
    circle.onmousedown = onStart; circle.ontouchstart = onStart; document.onmousemove = onMove; document.ontouchmove = onMove; document.onmouseup = onEnd; document.ontouchend = onEnd;
}

function updateImagePosition() { var img = document.getElementById('crop-image'); if(img) img.style.transform = 'translate(' + cropPosX + 'px, ' + cropPosY + 'px)'; }

function closeCropModal() { document.getElementById('crop-modal').classList.remove('active'); cropImageSrc = null; isDragging = false; document.onmousemove = null; document.ontouchmove = null; document.onmouseup = null; document.ontouchend = null; }
window.closeCropModal = closeCropModal;

async function saveCroppedImage() {
    var img = document.getElementById('crop-image');
    var canvas = document.createElement('canvas');
    var size = 400; canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.clip();
    var containerSize = 280; var scale = size / containerSize;
    var fitScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    var drawW = img.naturalWidth * fitScale; var drawH = img.naturalHeight * fitScale;
    var drawX = (size - drawW) / 2 + (cropPosX * scale); var drawY = (size - drawH) / 2 + (cropPosY * scale);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    var croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
    showToast("Uploading...");
    try {
        await FB.updateUser(FB.getCurrentUid(), { avatar: croppedBase64 });
        document.getElementById('p-img').style.backgroundImage = "url('" + croppedBase64 + "')";
        var headerAvatar = document.getElementById('user-avatar-header');
        if(headerAvatar) headerAvatar.style.backgroundImage = "url('" + croppedBase64 + "')";
        closeCropModal();
        showToast("Photo updated!");
    } catch(e) { showToast("Upload failed: " + e.message, "error"); }
}
window.saveCroppedImage = saveCroppedImage;

function openAdminLink(type) {
    var url = "";
    if(type === 'telegram') url = window.adminSettings && window.adminSettings.telegram;
    if(type === 'help') url = window.adminSettings && window.adminSettings.help;
    if(url && url.trim() !== "") window.open(url, '_blank');
    else showToast("Link not updated by admin yet!", "error");
}
window.openAdminLink = openAdminLink;

function confirmLogout() { if(confirm("Are you sure you want to logout?")) logoutUser(); }
window.confirmLogout = confirmLogout;
