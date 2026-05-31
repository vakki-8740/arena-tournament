async function initWalletData() {
    var uid = FB.getCurrentUid();
    if(!uid) return;
    try {
        var user = await FB.getUser(uid);
        window.userSavedUpi = user.saved_upi || null;
        window.userSavedBank = user.saved_bank ? JSON.parse(user.saved_bank) : null;
    } catch(e) {}
    try {
        window.adminSettings = await FB.getSettings();
        var qrImg = document.getElementById('d-qr-img');
        var upiId = document.getElementById('d-upi-id');
        if(window.adminSettings.qrImage && qrImg) qrImg.src = window.adminSettings.qrImage;
        if(window.adminSettings.upiId && upiId) upiId.innerText = window.adminSettings.upiId;
    } catch(e) {}
    loadTransactions();
}

function downloadQR() {
    var img = document.getElementById('d-qr-img');
    if(!img || !img.src) { showToast("QR image not found", "error"); return; }
    var link = document.createElement('a');
    link.download = 'Arena-QR-Code.png';
    link.href = img.src;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("QR Downloaded!");
}
window.downloadQR = downloadQR;

async function loadTransactions() {
    var list = document.getElementById('user-tx-list');
    if(!list) return;
    try {
        var txs = await FB.getTransactions(FB.getCurrentUid());
        list.innerHTML = '';
        var totalDep = 0, totalWit = 0, totalWinAmt = 0, totalWins = 0, bal = 0;
        txs.forEach(function(tx) {
            if(tx.status === 'Success') {
                if(tx.type === 'Deposit') { totalDep += Number(tx.amount); bal += Number(tx.amount); }
                if(tx.type === 'Withdraw') { totalWit += Number(tx.amount); bal -= Number(tx.amount); }
                if(tx.type === 'Win') { totalWinAmt += Number(tx.amount); totalWins++; bal += Number(tx.amount); }
                if(tx.type === 'Join Fee') bal -= Number(tx.amount);
            } else if(tx.status === 'Pending' && tx.type === 'Withdraw') { bal -= Number(tx.amount); }
        });
        window.userBalance = bal;
        document.getElementById('header-bal').innerText = bal;
        document.getElementById('main-bal').innerText = bal;
        var s = function(id, val) { var el = document.getElementById(id); if(el) el.innerText = val; };
        s('w-stat-dep', '₹' + totalDep); s('w-stat-wit', '₹' + totalWit);
        s('w-stat-earn', '₹' + totalWinAmt); s('w-stat-win', totalWins);
        txs.forEach(function(tx) {
            var iconCls = "dep", iconHtml = '<i class="fas fa-arrow-down"></i>', sign = '+';
            if(tx.type === 'Withdraw') { iconCls = "wit"; iconHtml = '<i class="fas fa-arrow-up"></i>'; sign = '-'; }
            else if(tx.type === 'Join Fee') { iconCls = "join"; iconHtml = '<i class="fas fa-gamepad"></i>'; sign = '-'; }
            else if(tx.type === 'Win') { iconCls = "dep"; iconHtml = '<i class="fas fa-trophy"></i>'; sign = '+'; }
            var color = sign === '+' ? 'var(--success)' : 'var(--text-main)';
            list.innerHTML += '<div class="tx-item"><div class="tx-left"><div class="tx-icon ' + iconCls + '">' + iconHtml + '</div><div class="tx-details"><h5>' + tx.type + '</h5><p>' + (tx.datetime || '') + ' • ' + tx.status + '</p></div></div><div class="tx-amount" style="color:' + color + ';">' + sign + ' ₹' + tx.amount + '</div></div>';
        });
        if(txs.length === 0) list.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:14px;">No Transactions Yet</div>';
    } catch(e) { list.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">No Transactions Yet</div>'; }
}

async function submitDeposit(btn) {
    var amt = document.getElementById('dep-amount').value;
    var utr = document.getElementById('dep-utr').value;
    if(!amt || amt < 10) { showToast("Minimum deposit ₹10", "error"); return; }
    if(utr.length !== 12) { showToast("Enter 12-Digit UTR", "error"); return; }
    btnLoading(btn, true);
    try {
        await FB.submitDeposit(FB.getCurrentUid(), Number(amt), utr);
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
    var container = document.getElementById('withdraw-methods-container');
    container.innerHTML = '<label style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:8px; display:block;">Select Withdrawal Method</label>';
    var hasMethod = false;
    if (window.userSavedUpi) { hasMethod = true; container.innerHTML += '<label class="pay-method-radio"><input type="radio" name="w_method" value="upi" checked><div class="pm-details"><strong>UPI ID</strong><span>' + window.userSavedUpi + '</span></div></label>'; }
    if (window.userSavedBank) { var isChecked = !hasMethod ? 'checked' : ''; hasMethod = true; container.innerHTML += '<label class="pay-method-radio"><input type="radio" name="w_method" value="bank" ' + isChecked + '><div class="pm-details"><strong>Bank Account</strong><span>Ac No: ' + window.userSavedBank.accNo + ' (' + window.userSavedBank.name + ')</span></div></label>'; }
    if (!hasMethod) container.innerHTML += '<div style="font-size:12px; color:var(--danger); margin-bottom:10px; background:rgba(255,59,48,0.1); padding:10px; border-radius:8px;">No payment methods found. Add one first.</div>';
    openModal('withdraw-modal');
}
window.openWithdrawModal = openWithdrawModal;

function switchPaymentTab(type) {
    document.querySelectorAll('#add-payment-modal .segment-btn').forEach(function(btn) { btn.classList.remove('active'); });
    event.target.classList.add('active');
    document.querySelectorAll('.pay-setup-form').forEach(function(form) { form.classList.remove('active'); });
    document.getElementById('pay-setup-' + type).classList.add('active');
}
window.switchPaymentTab = switchPaymentTab;

async function saveUpiMethod(btn) {
    var upi = document.getElementById('setup-upi-id').value;
    if(!upi.includes("@")) { showToast("Invalid UPI ID", "error"); return; }
    btnLoading(btn, true);
    try {
        await FB.updateUser(FB.getCurrentUid(), { saved_upi: upi });
        window.userSavedUpi = upi;
        showToast("UPI Added!");
        forceCloseModal('add-payment-modal');
        openWithdrawModal();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.saveUpiMethod = saveUpiMethod;

async function saveBankMethod(btn) {
    var name = document.getElementById('setup-bank-name').value;
    var acc = document.getElementById('setup-bank-acc').value;
    var ifsc = document.getElementById('setup-bank-ifsc').value;
    if(!name || !acc || !ifsc) { showToast("Fill all details", "error"); return; }
    btnLoading(btn, true);
    try {
        await FB.updateUser(FB.getCurrentUid(), { saved_bank: JSON.stringify({ name: name, accNo: acc, ifsc: ifsc }) });
        window.userSavedBank = { name: name, accNo: acc, ifsc: ifsc };
        showToast("Bank Added!");
        forceCloseModal('add-payment-modal');
        openWithdrawModal();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.saveBankMethod = saveBankMethod;

async function submitWithdraw(btn) {
    var amt = document.getElementById('with-amount').value;
    if(amt < 100) { showToast("Min withdraw ₹100", "error"); return; }
    if(amt > window.userBalance) { showToast("Insufficient Balance!", "error"); return; }
    var selectedMethod = document.querySelector('input[name="w_method"]:checked');
    if(!selectedMethod) { showToast("Select or add a payment method first", "error"); return; }
    var methodDetails = selectedMethod.value === "upi" ? "UPI: " + window.userSavedUpi : "Bank: " + window.userSavedBank.accNo;
    btnLoading(btn, true);
    try {
        var data = await FB.submitWithdraw(FB.getCurrentUid(), Number(amt), methodDetails);
        window.userBalance = data.balance;
        btnLoading(btn, false); forceCloseModal('withdraw-modal');
        document.getElementById('with-amount').value = '';
        var successModal = document.getElementById('success-anim-modal');
        successModal.style.display = 'flex';
        setTimeout(function() { successModal.style.display = 'none'; }, 2500);
        loadTransactions();
    } catch(e) { showToast(e.message, "error"); btnLoading(btn, false); }
}
window.submitWithdraw = submitWithdraw;
