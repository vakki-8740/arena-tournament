let adminToken = localStorage.getItem('admin_token');
const API_BASE = window.location.hostname === 'localhost' ? '' : 'https://arena-tournament-1.onrender.com';

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.style.background = type === "error" ? "rgba(255,59,48,0.95)" : "rgba(52,199,89,0.95)";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function btnLoading(btn, isLoading) {
    const ts = btn.querySelector('.btn-text'), sp = btn.querySelector('.spinner');
    if (isLoading) { btn.disabled = true; ts.style.display = 'none'; sp.style.display = 'block'; }
    else { btn.disabled = false; ts.style.display = 'block'; sp.style.display = 'none'; }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.querySelector('.sidebar-overlay').classList.toggle('mobile-open');
}

function closeModal(event, id) { if(event.target.id === id) document.getElementById(id).style.display = 'none'; }
function forceCloseModal(id) { document.getElementById(id).style.display = 'none'; }

async function adminFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(API_BASE + url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
}

async function handleLogin(btn) {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    btnLoading(btn, true);
    try {
        const data = await adminFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });
        adminToken = data.token;
        localStorage.setItem('admin_token', data.token);
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-layout').style.display = 'flex';
        showToast("Login Successful!");
        loadAllData();
    } catch(e) { showToast("Invalid Credentials!", "error"); }
    btnLoading(btn, false);
}

function switchTab(tabId, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if(window.innerWidth <= 768) toggleSidebar();
}

function logout() { localStorage.removeItem('admin_token'); location.reload(); }

function logout() { localStorage.removeItem('admin_token'); location.reload(); }

function filterUsers() {
    const q = document.getElementById('search-users').value.toLowerCase();
    document.querySelectorAll('#user-list tr').forEach(r => { r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none'; });
}

function filterTrx() {
    const q = document.getElementById('search-trx').value.toLowerCase();
    const typeF = document.getElementById('filter-trx-type').value;
    const statusF = document.getElementById('filter-trx-status').value;
    document.querySelectorAll('#trx-list tr').forEach(r => {
        let show = r.innerText.toLowerCase().includes(q);
        if(typeF && !r.dataset.type?.includes(typeF)) show = false;
        if(statusF && !r.dataset.status?.includes(statusF)) show = false;
        r.style.display = show ? '' : 'none';
    });
}

// ==================== LOAD ALL DATA ====================

async function loadAllData() {
    try {
        const stats = await adminFetch('/api/admin/stats');
        document.getElementById('stat-users').innerText = stats.users;
        document.getElementById('stat-deposit').innerText = '₹' + stats.deposits;
        document.getElementById('stat-withdraw').innerText = '₹' + stats.withdrawals;
        document.getElementById('stat-tournaments').innerText = stats.tournaments;
    } catch(e) {}

    try {
        const txs = await adminFetch('/api/transactions/all');
        let pendingDep = 0, pendingWit = 0;
        txs.forEach(tx => {
            if(tx.status === 'Pending' && tx.type === 'Deposit') pendingDep++;
            if(tx.status === 'Pending' && tx.type === 'Withdraw') pendingWit++;
        });
        document.getElementById('stat-pending-dep').innerText = pendingDep;
        document.getElementById('stat-pending-wit').innerText = pendingWit;

        // Recent transactions
        const tbody = document.getElementById('recent-trx-list');
        tbody.innerHTML = '';
        txs.slice(0, 10).forEach(tx => {
            let badgeColor = tx.status === 'Success' ? 'var(--success)' : tx.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)';
            tbody.innerHTML += `<tr><td>${tx.user_id}</td><td style="color:var(--primary); font-weight:700;">${tx.type}</td><td><strong>₹${tx.amount}</strong></td><td><span style="color:${badgeColor}; font-weight:bold; font-size:12px;">${tx.status}</span></td></tr>`;
        });
    } catch(e) {}

    try {
        const polls = await adminFetch('/api/polls');
        let activePolls = polls.filter(p => p.status === 'active').length;
        document.getElementById('stat-active-polls').innerText = activePolls;
    } catch(e) {}

    try {
        const txs = await adminFetch('/api/transactions/all');
        let completed = 0;
        try {
            const tours = await adminFetch('/api/tournaments');
            tours.forEach(t => { if(t.status === 'completed') completed++; });
        } catch(e) {}
        document.getElementById('stat-completed-tour').innerText = completed;
    } catch(e) {}

    loadUsers();
    loadTransactions();
    loadTournaments();
    loadPolls();
    loadSettings();
}

// ==================== USERS ====================

async function loadUsers() {
    try {
        const users = await adminFetch('/api/admin/users');
        const tbody = document.getElementById('user-list');
        tbody.innerHTML = '';
        if(!users.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No Users</td></tr>'; return; }
        users.forEach(u => {
            const sc = u.status === 'Blocked' ? 'var(--danger)' : 'var(--success)';
            const bt = u.status === 'Blocked' ? 'Unblock' : 'Block';
            tbody.innerHTML += `<tr>
                <td><strong>${u.name}</strong><br><span style="font-size:11px; color:var(--text-muted);">ID: ${u.id}</span></td>
                <td style="font-size:12px;">${u.phone || '-'}<br>${u.email || '-'}</td>
                <td><strong>₹${u.balance || 0}</strong></td>
                <td><span style="font-size:11px; padding:3px 8px; border-radius:6px; background:${u.login_method === 'google' ? 'rgba(66,133,244,0.1); color:#4285f4' : 'rgba(0,0,0,0.05); color:var(--text-muted)'};">${u.login_method || 'local'}</span></td>
                <td><span style="color:${sc}; font-weight:bold; font-size:12px;">${u.status}</span></td>
                <td class="action-btns">
                    <button class="btn" style="padding:4px 10px; font-size:11px;" onclick="viewUserDetail('${u.id}')">View</button>
                    <button class="btn btn-warning" style="padding:4px 10px; font-size:11px;" onclick="openBalanceEdit('${u.id}', '${u.name}', ${u.balance || 0})">Edit Bal</button>
                    <button class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="toggleBlockUser('${u.id}', '${u.status}')">${bt}</button>
                    <button class="btn btn-danger" style="padding:4px 10px; font-size:11px; background:#cc0000;" onclick="deleteUser('${u.id}', '${u.name}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
        filterUsers();
    } catch(e) {}
}

async function viewUserDetail(userId) {
    try {
        const users = await adminFetch('/api/admin/users');
        const user = users.find(u => String(u.id) === String(userId));
        if(!user) { showToast("User not found", "error"); return; }

        let txs = [];
        try { txs = await adminFetch('/api/transactions/all'); } catch(e) {}
        const userTxs = txs.filter(t => String(t.user_id) === String(userId));

        let totalDep = 0, totalWit = 0, totalJoin = 0, totalWin = 0;
        userTxs.forEach(t => {
            if(t.status === 'Success') {
                if(t.type === 'Deposit') totalDep += Number(t.amount);
                if(t.type === 'Withdraw') totalWit += Number(t.amount);
                if(t.type === 'Join Fee') totalJoin += Number(t.amount);
                if(t.type === 'Win') totalWin += Number(t.amount);
            }
        });

        let txHistory = '';
        userTxs.slice(0, 20).forEach(t => {
            let bc = t.status === 'Success' ? 'var(--success)' : t.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)';
            txHistory += `<tr><td style="font-size:12px;">${t.type}</td><td style="font-size:12px;"><strong>₹${t.amount}</strong></td><td style="font-size:12px;">${t.datetime || '-'}</td><td><span style="color:${bc}; font-weight:bold; font-size:11px;">${t.status}</span></td></tr>`;
        });

        document.getElementById('user-detail-content').innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <div style="width:80px; height:80px; border-radius:50%; background:url('${user.avatar || ''}') center/cover, linear-gradient(135deg, var(--primary), #34aeff); margin:0 auto 10px; border:3px solid var(--primary); display:flex; align-items:center; justify-content:center; color:white; font-size:24px; font-weight:700;">${user.name ? user.name[0].toUpperCase() : 'U'}</div>
                <h3 style="font-weight:800; font-size:18px;">${user.name}</h3>
                <p style="font-size:12px; color:var(--text-muted);">${user.email || 'No email'}</p>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                <div style="background:#f9f9fb; padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:3px;">USER ID</span>
                    <strong style="font-size:14px;">${user.id}</strong>
                </div>
                <div style="background:#f9f9fb; padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:3px;">PHONE</span>
                    <strong style="font-size:14px;">${user.phone || '-'}</strong>
                </div>
                <div style="background:#f9f9fb; padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:3px;">LOGIN METHOD</span>
                    <strong style="font-size:14px;">${user.login_method || 'local'}</strong>
                </div>
                <div style="background:#f9f9fb; padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:3px;">STATUS</span>
                    <strong style="font-size:14px; color:${user.status === 'Blocked' ? 'var(--danger)' : 'var(--success)'};">${user.status}</strong>
                </div>
            </div>

            <div style="background:linear-gradient(135deg, var(--primary), #0056b3); color:white; padding:20px; border-radius:16px; margin-bottom:20px;">
                <div style="font-size:11px; opacity:0.8;">WALLET BALANCE</div>
                <div style="font-size:32px; font-weight:800;">₹${user.balance || 0}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                <div style="background:rgba(52,199,89,0.1); padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block;">TOTAL DEPOSIT</span>
                    <strong style="color:var(--success); font-size:16px;">₹${totalDep}</strong>
                </div>
                <div style="background:rgba(255,59,48,0.1); padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block;">TOTAL WITHDRAW</span>
                    <strong style="color:var(--danger); font-size:16px;">₹${totalWit}</strong>
                </div>
                <div style="background:rgba(0,122,255,0.1); padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block;">TOTAL JOIN FEES</span>
                    <strong style="color:var(--primary); font-size:16px;">₹${totalJoin}</strong>
                </div>
                <div style="background:rgba(255,149,0,0.1); padding:12px; border-radius:10px; text-align:center;">
                    <span style="font-size:10px; color:var(--text-muted); display:block;">TOTAL WINS</span>
                    <strong style="color:var(--warning); font-size:16px;">₹${totalWin}</strong>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="btn btn-warning" style="flex:1;" onclick="forceCloseModal('user-detail-modal'); openBalanceEdit('${user.id}', '${user.name}', ${user.balance || 0})"><i class="fas fa-edit"></i> Edit Balance</button>
                <button class="btn btn-danger" style="flex:1; background:#cc0000;" onclick="forceCloseModal('user-detail-modal'); deleteUser('${user.id}', '${user.name}')"><i class="fas fa-trash"></i> Delete User</button>
            </div>

            <h3 style="font-size:14px; font-weight:800; margin-bottom:10px;">Transaction History (${userTxs.length})</h3>
            <div style="max-height:300px; overflow-y:auto;">
                <table class="data-table" style="min-width:auto;">
                    <thead><tr><th>Type</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>${txHistory || '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No transactions</td></tr>'}</tbody>
                </table>
            </div>
        `;
        document.getElementById('user-detail-modal').style.display = 'flex';
    } catch(e) { showToast("Error loading user", "error"); }
}

function openBalanceEdit(userId, name, currentBal) {
    document.getElementById('edit-u-name').innerText = name + ' (ID: ' + userId + ')';
    document.getElementById('edit-u-id').value = userId;
    document.getElementById('edit-u-bal').value = currentBal;
    document.getElementById('edit-balance-modal').style.display = 'flex';
}

async function saveBalance(btn) {
    const bal = document.getElementById('edit-u-bal').value;
    const id = document.getElementById('edit-u-id').value;
    if(bal === "") { showToast("Enter amount", "error"); return; }
    btnLoading(btn, true);
    try {
        await adminFetch(`/api/admin/users/${id}/balance`, { method: 'PUT', body: JSON.stringify({ balance: Number(bal) }) });
        showToast("Balance Updated!");
        forceCloseModal('edit-balance-modal');
        loadUsers();
    } catch(e) { showToast("Error", "error"); }
    btnLoading(btn, false);
}

async function toggleBlockUser(id, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Blocked' : 'Active';
    try {
        await adminFetch(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
        showToast(`User ${newStatus}`);
        loadUsers();
    } catch(e) { showToast("Error", "error"); }
}

async function deleteUser(id, name) {
    if(!confirm(`Delete user "${name}"? This action cannot be undone!`)) return;
    try {
        await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        showToast("User deleted!");
        loadUsers();
        loadAllData();
    } catch(e) { showToast("Error", "error"); }
}

// ==================== TRANSACTIONS ====================

async function loadTransactions() {
    try {
        const txs = await adminFetch('/api/transactions/all');
        const tbody = document.getElementById('trx-list');
        tbody.innerHTML = '';
        if(!txs.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No transactions</td></tr>'; return; }
        txs.forEach(tx => {
            let extra = tx.type === 'Deposit' ? `UTR: ${tx.utr}` : tx.type === 'Withdraw' ? `UPI: ${tx.upi}` : '';
            let bc = tx.status === 'Success' ? 'var(--success)' : tx.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)';
            tbody.innerHTML += `<tr data-type="${tx.type}" data-status="${tx.status}">
                <td style="font-size:12px;">${tx.user_id}</td>
                <td style="color:var(--primary); font-weight:800; font-size:13px;">${tx.type}</td>
                <td><strong>₹${tx.amount}</strong></td>
                <td style="font-size:11px; color:var(--text-muted);">${extra}</td>
                <td style="font-size:11px;">${tx.datetime || '-'}</td>
                <td><span style="color:${bc}; font-weight:bold; font-size:12px;">${tx.status}</span></td>
                <td class="action-btns">${tx.status === 'Pending' ? `<button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="updateTrx('${tx.id}', 'Success')">Approve</button><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="updateTrx('${tx.id}', 'Rejected')">Reject</button>` : '-'}</td>
            </tr>`;
        });
        filterTrx();
    } catch(e) {}
}

async function updateTrx(id, status) {
    try {
        await adminFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
        showToast(`Transaction ${status}`);
        loadTransactions();
        loadUsers();
    } catch(e) { showToast("Error", "error"); }
}

// ==================== TOURNAMENTS ====================

async function loadTournaments() {
    try {
        const tours = await adminFetch('/api/tournaments');
        const tbody = document.getElementById('tournament-list');
        tbody.innerHTML = '';
        tours.forEach(t => {
            let players = t.joinedPlayers ? Object.keys(t.joinedPlayers).length : 0;
            tbody.innerHTML += `<tr>
                <td><strong>${t.title}</strong></td>
                <td style="font-size:12px;">${t.map} <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 6px; border-radius:6px; font-size:10px; font-weight:700;">${t.type || 'Solo'}</span></td>
                <td style="font-size:12px;">Entry: ₹${t.entry}<br>Prize: ₹${t.prize}</td>
                <td><span style="color:${t.status==='live'?'var(--success)':'var(--warning)'}; font-weight:bold; text-transform:capitalize;">${t.status}</span></td>
                <td style="font-size:12px;">${players}/${t.target || 50}</td>
                <td class="action-btns">
                    <button class="btn" style="padding:4px 10px; font-size:11px;" onclick='editTournament(${JSON.stringify(t).replace(/'/g,"&#39;")})'>Edit</button>
                    <button class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="deleteTournament('${t.id}')">Delete</button>
                </td>
            </tr>`;
        });
    } catch(e) {}
}

async function createOrUpdateTournament(btn) {
    const id = document.getElementById('t-edit-id').value;
    let rawTime = document.getElementById('t-time').value;
    let formattedTime = "TBA", rawTimeObjStr = "";
    if(rawTime) {
        let [h, m] = rawTime.split(':');
        let ampm = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12 || 12;
        formattedTime = (h12<10?'0'+h12:h12)+':'+m+' '+ampm;
        let d = new Date(); d.setHours(h,m,0,0); rawTimeObjStr = d.toISOString();
    }
    const tData = {
        image:document.getElementById('t-image').value, title:document.getElementById('t-title').value,
        map:document.getElementById('t-map').value, type:document.getElementById('t-type').value, status:document.getElementById('t-status').value,
        entry:Number(document.getElementById('t-entry').value), prize:Number(document.getElementById('t-prize').value),
        kill:Number(document.getElementById('t-kill').value), time:formattedTime, rawTimeObj:rawTimeObjStr,
        target:Number(document.getElementById('t-target').value), roomId:document.getElementById('t-room-id').value,
        roomPass:document.getElementById('t-room-pass').value, showRoom:document.getElementById('t-show-room').value==="true",
        winnerName:document.getElementById('t-winner-name').value, winnerUid:document.getElementById('t-winner-uid').value,
        rules:document.getElementById('t-rules').value
    };
    if(!tData.title) { showToast("Title required!", "error"); return; }
    btnLoading(btn, true);
    try {
        if(id) { await adminFetch(`/api/tournaments/${id}`, { method:'PUT', body:JSON.stringify(tData) }); showToast("Updated!"); }
        else { await adminFetch('/api/tournaments', { method:'POST', body:JSON.stringify(tData) }); showToast("Published!"); }
        cancelEdit(); loadTournaments();
    } catch(e) { showToast("Error", "error"); }
    btnLoading(btn, false);
}

function editTournament(t) {
    document.getElementById('t-edit-id').value = t.id;
    document.getElementById('t-image').value = t.image||'';
    document.getElementById('t-title').value = t.title||'';
    document.getElementById('t-map').value = t.map||'';
    document.getElementById('t-type').value = t.type||'Solo';
    document.getElementById('t-status').value = t.status||'live';
    document.getElementById('t-entry').value = t.entry||'';
    document.getElementById('t-prize').value = t.prize||'';
    document.getElementById('t-kill').value = t.kill||'';
    document.getElementById('t-target').value = t.target||'';
    document.getElementById('t-room-id').value = t.room_id||'';
    document.getElementById('t-room-pass').value = t.room_pass||'';
    document.getElementById('t-show-room').value = t.show_room?"true":"false";
    document.getElementById('t-winner-name').value = t.winner_name||'';
    document.getElementById('t-winner-uid').value = t.winner_uid||'';
    document.getElementById('t-rules').value = t.rules||'';
    if(t.raw_time_obj) { let d=new Date(t.raw_time_obj); document.getElementById('t-time').value=`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
    else document.getElementById('t-time').value='';
    document.getElementById('t-btn-text').innerText = "Update Tournament";
    document.getElementById('btn-t-cancel').style.display = "inline-flex";
    showToast("Loaded for editing");
}

async function deleteTournament(id) {
    if(!confirm("Delete tournament?")) return;
    try { await adminFetch(`/api/tournaments/${id}`, {method:'DELETE'}); showToast("Deleted!"); loadTournaments(); } catch(e) { showToast("Error","error"); }
}

function cancelEdit() {
    ['t-edit-id','t-image','t-title','t-map','t-entry','t-prize','t-kill','t-time','t-target','t-room-id','t-room-pass','t-winner-name','t-winner-uid','t-rules'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('t-status').value='live'; document.getElementById('t-show-room').value='false';
    document.getElementById('t-btn-text').innerText="Publish"; document.getElementById('btn-t-cancel').style.display="none";
}

// ==================== POLLS ====================

async function loadPolls() {
    try {
        const polls = await adminFetch('/api/polls');
        const tbody = document.getElementById('poll-list');
        tbody.innerHTML = '';
        polls.forEach(p => {
            let totalVotes = p.votes ? Object.keys(p.votes).length : 0;
            let opts = p.options ? Object.values(p.options).join(', ') : '';
            tbody.innerHTML += `<tr>
                <td><strong>${p.question}</strong></td>
                <td style="font-size:12px;">${opts}</td>
                <td><strong style="color:var(--primary);">${totalVotes}</strong></td>
                <td><span style="color:${p.status==='active'?'var(--success)':'var(--danger)'}; font-weight:bold; text-transform:capitalize;">${p.status}</span></td>
                <td class="action-btns">
                    <button class="btn" style="padding:4px 10px; font-size:11px;" onclick='editPoll(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button>
                    <button class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="deletePoll(${p.id})">Delete</button>
                </td>
            </tr>`;
        });
    } catch(e) {}
}

async function createOrUpdatePoll(btn) {
    const id = document.getElementById('p-edit-id').value;
    const question = document.getElementById('p-question').value;
    const status = document.getElementById('p-status').value;
    const opt1=document.getElementById('p-opt1').value, opt2=document.getElementById('p-opt2').value;
    const opt3=document.getElementById('p-opt3').value, opt4=document.getElementById('p-opt4').value;
    if(!question||!opt1||!opt2) { showToast("Question + 2 options required!", "error"); return; }
    const options = {opt1,opt2}; if(opt3)options.opt3=opt3; if(opt4)options.opt4=opt4;
    btnLoading(btn, true);
    try {
        if(id) { await adminFetch(`/api/polls/${id}`, {method:'PUT', body:JSON.stringify({question,status,options})}); showToast("Updated!"); }
        else { await adminFetch('/api/polls', {method:'POST', body:JSON.stringify({question,status,options})}); showToast("Created!"); }
        cancelPollEdit(); loadPolls();
    } catch(e) { showToast("Error","error"); }
    btnLoading(btn, false);
}

function editPoll(p) {
    document.getElementById('p-edit-id').value=p.id;
    document.getElementById('p-question').value=p.question||'';
    document.getElementById('p-status').value=p.status||'active';
    document.getElementById('p-opt1').value=(p.options&&p.options.opt1)||'';
    document.getElementById('p-opt2').value=(p.options&&p.options.opt2)||'';
    document.getElementById('p-opt3').value=(p.options&&p.options.opt3)||'';
    document.getElementById('p-opt4').value=(p.options&&p.options.opt4)||'';
    document.getElementById('p-btn-text').innerText="Update Poll";
    document.getElementById('btn-p-cancel').style.display="inline-flex";
}

async function deletePoll(id) {
    if(!confirm("Delete poll?")) return;
    try { await adminFetch(`/api/polls/${id}`, {method:'DELETE'}); showToast("Deleted!"); loadPolls(); } catch(e) { showToast("Error","error"); }
}

function cancelPollEdit() {
    document.getElementById('p-edit-id').value='';
    document.getElementById('p-question').value='';
    document.getElementById('p-status').value='active';
    ['p-opt1','p-opt2','p-opt3','p-opt4'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('p-btn-text').innerText="Publish Poll";
    document.getElementById('btn-p-cancel').style.display="none";
}

// ==================== SETTINGS ====================

async function loadSettings() {
    try {
        const s = await adminFetch('/api/settings');
        document.getElementById('s-qr').value = s.qrImage||'';
        document.getElementById('s-upi').value = s.upiId||'';
        document.getElementById('s-qr-link').value = s.qrLink||'';
        document.getElementById('s-min-withdraw').value = s.minWithdraw||'';
        document.getElementById('s-telegram').value = s.telegram||'';
        document.getElementById('s-help').value = s.help||'';
        document.getElementById('s-appname').value = s.appName||'';
        document.getElementById('s-applogo').value = s.appLogo||'';
        document.getElementById('s-bot-token').value = s.telegramBotToken||'';
        document.getElementById('s-payment-channel').value = s.telegramPaymentChannel||'';
        document.getElementById('s-user-channel').value = s.telegramUserChannel||'';
        document.getElementById('s-tournament-channel').value = s.telegramTournamentChannel||'';
    } catch(e) {}
}

async function saveSettings(btn) {
    btnLoading(btn, true);
    try {
        await adminFetch('/api/settings', { method:'PUT', body:JSON.stringify({
            qrImage:document.getElementById('s-qr').value, upiId:document.getElementById('s-upi').value,
            qrLink:document.getElementById('s-qr-link').value, minWithdraw:document.getElementById('s-min-withdraw').value,
            telegram:document.getElementById('s-telegram').value, help:document.getElementById('s-help').value,
            appName:document.getElementById('s-appname').value, appLogo:document.getElementById('s-applogo').value,
            telegramBotToken:document.getElementById('s-bot-token').value,
            telegramPaymentChannel:document.getElementById('s-payment-channel').value,
            telegramUserChannel:document.getElementById('s-user-channel').value,
            telegramTournamentChannel:document.getElementById('s-tournament-channel').value
        })});
        showToast("Settings Saved!");
    } catch(e) { showToast("Error","error"); }
    btnLoading(btn, false);
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
    if(adminToken) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-layout').style.display = 'flex';
        loadAllData();
    }
});
