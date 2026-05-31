async function initWalletData() {
    if(!window.userToken) return;
    try {
        const user = await apiFetch('/api/auth/user');
        window.userSavedUpi = user.saved_upi || null;
        window.userSavedBank = user.saved_bank ? JSON.parse(user.saved_bank) : null;
    } catch(e) {}

    try {
        window.adminSettings = await apiFetch('/api/settings');
        const qrImg = document.getElementById('d-qr-img');
        const upiId = document.getElementById('d-upi-id');
        if(window.adminSettings.qrImage && qrImg) qrImg.src = window.adminSettings.qrImage;
        if(window.adminSettings.upiId && upiId) upiId.innerText = window.adminSettings.upiId;
    } catch(e) { console.error("Settings load error:", e); }

    loadTransactions();
}

// QR Code download function
function downloadQR() {
    const img = document.getElementById('d-qr-img');
    if(!img || !img.src) { showToast("QR image not found", "error"); return; }

    showToast("Downloading...");

    // Draw image on canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';

    tempImg.onload = function() {
        canvas.width = tempImg.naturalWidth;
        canvas.height = tempImg.naturalHeight;
        ctx.drawImage(tempImg, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = 'Arena-QR-Code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast("QR Downloaded!");
    };

    tempImg.onerror = function() {
        // If canvas fails, download from URL directly
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'Arena-QR-Code.png';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("QR Downloaded!");
    };

    tempImg.src = img.src;
}
window.downloadQR = downloadQR;

async function loadTransactions() {
    const list = document.getElementById('user-tx-list');
    if(!list) return;
    try {
        const txs = await apiFetch('/api/transactions');
        list.innerHTML = '';
        let totalDep = 0, totalWit = 0, totalWinAmt = 0, totalWins = 0, bal = 0;

        txs.forEach(tx => {
            if(tx.status === 'Success') {
                if(tx.type === 'Deposit') { totalDep += Number(tx.amount); bal += Number(tx.amount); }
                if(tx.type === 'Withdraw') { totalWit += Number(tx.amount); bal -= Number(tx.amount); }
                if(tx.type === 'Win') { totalWinAmt += Number(tx.amount); totalWins++; bal += Number(tx.amount); }
                if(tx.type === 'Join Fee') bal -= Number(tx.amount);
            } else if(tx.status === 'Pending' && tx.type === 'Withdraw') {
                bal -= Number(tx.amount);
            }
        });

        window.userBalance = bal;
        document.getElementById('header-bal').innerText = bal;
        document.getElementById('main-bal').innerText = bal;

        const s = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        s('w-stat-dep', '₹' + totalDep); s('w-stat-wit', '₹' + totalWit);
        s('w-stat-earn', '₹' + totalWinAmt); s('w-stat-win', totalWins);

        txs.forEach(tx => {
            let iconCls = "dep", iconHtml = '<i class="fas fa-arrow-down"></i>', sign = '+';
            if(tx.type === 'Withdraw') { iconCls = "wit"; iconHtml = '<i class="fas fa-arrow-up"></i>'; sign = '-'; }
            else if(tx.type === 'Join Fee') { iconCls = "join"; iconHtml = '<i class="fas fa-gamepad"></i>'; sign = '-'; }
            else if(tx.type === 'Win') { iconCls = "dep"; iconHtml = '<i class="fas fa-trophy"></i>'; sign = '+'; }
            let color = sign === '+' ? 'var(--success)' : 'var(--text-main)';
            list.innerHTML += `<div class="tx-item"><div class="tx-left"><div class="tx-icon ${iconCls}">${iconHtml}</div><div class="tx-details"><h5>${tx.type}</h5><p>${tx.datetime || ''} • ${tx.status}</p></div></div><div class="tx-amount" style="color:${color};">${sign} ₹${tx.amount}</div></div>`;
        });
        if(txs.length === 0) list.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:14px;">No Transactions Yet</div>';
    } catch(e) { list.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">No Transactions Yet</div>'; }
}

async function submitDeposit(btn) {
    const amt = document.getElementById('dep-amount').value;
    const utr = document.getElementById('dep-utr').value;
    if(!amt || amt < 10) { showToast("Minimum deposit ₹10", "error"); return; }
    if(utr.length !== 12) { showToast("Enter 12-Digit UTR", "error"); return; }
    btnLoading(btn, true);
    try {
        await apiFetch('/api/transactions/deposit', { method: 'POST', body: JSON.stringify({ amount: Number(amt), utr }) });
        showToast("Deposit Request Sent!");
        forceCloseModal('deposit-modal');
        document.getElementById('dep-amount').value = '';
        document.getElementById('dep-utr').value = '';
        loadTransactions();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.submitDeposit = submitDeposit;

function openWithdrawModal() {
    document.getElementById('with-amount').value = '';
    const container = document.getElementById('withdraw-methods-container');
    container.innerHTML = '<label style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px; display:block;">Select Withdrawal Method</label>';
    let hasMethod = false;
    if (window.userSavedUpi) {
        hasMethod = true;
        container.innerHTML += `<label class="pay-method-radio"><input type="radio" name="w_method" value="upi" checked><div class="pm-details"><strong>UPI ID</strong><span>${window.userSavedUpi}</span></div></label>`;
    }
    if (window.userSavedBank) {
        const isChecked = !hasMethod ? 'checked' : '';
        hasMethod = true;
        container.innerHTML += `<label class="pay-method-radio"><input type="radio" name="w_method" value="bank" ${isChecked}><div class="pm-details"><strong>Bank Account</strong><span>Ac No: ${window.userSavedBank.accNo} (${window.userSavedBank.name})</span></div></label>`;
    }
    if (!hasMethod) container.innerHTML += '<div style="font-size:12px; color:var(--danger); margin-bottom:10px; background:rgba(255,59,48,0.1); padding:10px; border-radius:8px;">No payment methods found. Add one first.</div>';
    openModal('withdraw-modal');
}
window.openWithdrawModal = openWithdrawModal;

function switchPaymentTab(type) {
    document.querySelectorAll('#add-payment-modal .segment-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.pay-setup-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`pay-setup-${type}`).classList.add('active');
}
window.switchPaymentTab = switchPaymentTab;

async function saveUpiMethod(btn) {
    const upi = document.getElementById('setup-upi-id').value;
    if(!upi.includes("@")) { showToast("Invalid UPI ID", "error"); return; }
    btnLoading(btn, true);
    try {
        await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ savedUpi: upi }) });
        window.userSavedUpi = upi;
        showToast("UPI Added!");
        forceCloseModal('add-payment-modal');
        openWithdrawModal();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.saveUpiMethod = saveUpiMethod;

async function saveBankMethod(btn) {
    const name = document.getElementById('setup-bank-name').value;
    const acc = document.getElementById('setup-bank-acc').value;
    const ifsc = document.getElementById('setup-bank-ifsc').value;
    if(!name || !acc || !ifsc) { showToast("Fill all details", "error"); return; }
    btnLoading(btn, true);
    try {
        await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ savedBank: { name, accNo: acc, ifsc } }) });
        window.userSavedBank = { name, accNo: acc, ifsc };
        showToast("Bank Added!");
        forceCloseModal('add-payment-modal');
        openWithdrawModal();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.saveBankMethod = saveBankMethod;

async function submitWithdraw(btn) {
    const amt = document.getElementById('with-amount').value;
    if(amt < 100) { showToast("Min withdraw ₹100", "error"); return; }
    if(amt > window.userBalance) { showToast("Insufficient Balance!", "error"); return; }
    const selectedMethod = document.querySelector('input[name="w_method"]:checked');
    if(!selectedMethod) { showToast("Select or add a payment method first", "error"); return; }
    let methodDetails = selectedMethod.value === "upi" ? "UPI: " + window.userSavedUpi : `Bank: ${window.userSavedBank.accNo}`;
    btnLoading(btn, true);
    try {
        const data = await apiFetch('/api/transactions/withdraw', { method: 'POST', body: JSON.stringify({ amount: Number(amt), method: methodDetails }) });
        window.userBalance = data.balance;
        btnLoading(btn, false); forceCloseModal('withdraw-modal');
        document.getElementById('with-amount').value = '';
        const successModal = document.getElementById('success-anim-modal');
        successModal.style.display = 'flex';
        setTimeout(() => { successModal.style.display = 'none'; }, 2500);
        loadTransactions();
    } catch(e) { showToast(e.message, "error"); btnLoading(btn, false); }
}
window.submitWithdraw = submitWithdraw;

document.addEventListener('DOMContentLoaded', () => {
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadHeader();
        initWalletData();
    } else { window.location.href = '/home.html'; }
});
