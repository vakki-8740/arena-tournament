let myJoinedTournaments = new Set();
let allTournamentsData = {};
let globalTimerInterval = null;

function switchMatchTab(type) {
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.match-list').forEach(list => list.classList.remove('active'));
    document.getElementById(`list-${type}`).classList.add('active');
}
window.switchMatchTab = switchMatchTab;

async function initMatchesData() {
    if(!window.userToken) return;
    try {
        const user = await apiFetch('/api/auth/user');
        window.userBalance = user.balance || 0;
        document.getElementById('header-bal').innerText = window.userBalance;
    } catch(e) {}
    renderMatchesTournaments();
}

async function renderMatchesTournaments() {
    const upcomingContainer = document.getElementById('list-upcoming');
    const completedContainer = document.getElementById('list-completed');

    try {
        const [tournaments, txs] = await Promise.all([
            fsGetTournaments(),
            apiFetch('/api/transactions')
        ]);
        myJoinedTournaments.clear();
        allTournamentsData = {};

        txs.forEach(tx => {
            if(tx.status === 'Success' && tx.type === 'Join Fee' && tx.tournament_id) {
                myJoinedTournaments.add(String(tx.tournament_id));
            }
        });

        let joinedHtml = '';
        let completedHtml = '';

        tournaments.forEach(t => {
            allTournamentsData[t.id] = t;
            if(t.status !== "completed") {
                if(myJoinedTournaments.has(String(t.id)) || t.status === "soon") {
                    let statusClass = myJoinedTournaments.has(String(t.id)) ? "badge-joined" : "badge-soon";
                    let statusText = myJoinedTournaments.has(String(t.id)) ? "Joined Successfully" : "Starts Soon";
                    joinedHtml += `<div class="premium-match-card" onclick="openTournamentDetail('${t.id}')"><img src="${t.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23007aff%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22 font-weight=%22bold%22%3EArena%3C/text%3E%3C/svg%3E'}" class="pmc-img"><div class="pmc-info"><h4>${t.title}</h4><p style="margin-bottom:8px;"><i class="far fa-clock"></i> <span class="dynamic-timer" data-time="${t.raw_time_obj}">--h --m --s</span> <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700; margin-left:6px;">${t.type || 'Solo'}</span></p><div class="pmc-badge ${statusClass}">${statusText}</div></div></div>`;
                }
            } else {
                if(myJoinedTournaments.has(String(t.id))) {
                    completedHtml += `<div class="premium-match-card" onclick="openTournamentDetail('${t.id}')"><img src="${t.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23007aff%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22 font-weight=%22bold%22%3EArena%3C/text%3E%3C/svg%3E'}" class="pmc-img"><div class="pmc-info"><h4>${t.title}</h4><p>Completed <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700; margin-left:6px;">${t.type || 'Solo'}</span></p><div class="pmc-badge" style="background:rgba(0,122,255,0.1); color:var(--primary);">View Result</div></div></div>`;
                }
            }
        });

        if(!joinedHtml) joinedHtml = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">No joined matches yet</div>';
        if(!completedHtml) completedHtml = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">No completed matches</div>';
        upcomingContainer.innerHTML = joinedHtml;
        completedContainer.innerHTML = completedHtml;
        startGlobalTimer();
    } catch(e) {}
}

function openTournamentDetail(tid) {
    const data = allTournamentsData[tid];
    if(!data) return;
    window.currentTID = tid;
    window.currentEntryFee = Number(data.entry);
    let joinedCount = data.joinedPlayers ? Object.keys(data.joinedPlayers).length : 0;
    const totalTarget = data.target || 50;

    document.getElementById('td-full-img').src = data.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22200%22%3E%3Crect fill=%22%23007aff%22 width=%22500%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22 font-weight=%22bold%22%3EArena Tournament%3C/text%3E%3C/svg%3E';
    document.getElementById('td-full-title').innerText = data.title || 'Tournament';
    document.getElementById('td-full-map').innerText = data.map || 'N/A';
    document.getElementById('td-full-type').innerText = data.type || 'Solo';
    document.getElementById('td-full-entry').innerText = '₹' + (data.entry || '0');
    document.getElementById('td-full-prize').innerText = '₹' + (data.prize || '0');
    document.getElementById('td-full-kill').innerText = '₹' + (data.kill || '0');
    document.getElementById('td-full-rules').innerText = data.rules || 'Play fair.';
    document.getElementById('td-live-timer-text').setAttribute('data-time', data.raw_time_obj || "");

    document.getElementById('td-full-joined-ui').innerHTML = `<div class="joined-players-ui" onclick="viewJoinedPlayers('${tid}')"><div class="jp-avatars"><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}1')"></div><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}2')"></div><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}3')"></div></div><div class="jp-text"><strong>${joinedCount}/${totalTarget}</strong> Players Joined</div></div>`;

    const roomBox = document.getElementById('td-room-details');
    const mainBtn = document.getElementById('main-join-btn');
    const btnText = mainBtn.querySelector('.btn-text');
    mainBtn.classList.remove('btn-joined');

    if(myJoinedTournaments.has(String(tid))) {
        mainBtn.disabled = true; mainBtn.classList.add('btn-joined'); btnText.innerHTML = "<i class='fas fa-check-circle'></i> Already Joined";
        if(data.showRoom) {
            roomBox.innerHTML = `<div class="fp-box" style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); margin-bottom: 20px;"><h3 style="color: var(--success); margin-bottom:10px; font-size: 15px;"><i class="fas fa-key"></i> Room Details</h3><div class="fp-row" style="align-items:center;"><span>Room ID:</span><div style="display:flex; align-items:center; gap:8px;"><strong id="td-room-id" style="user-select:all; font-size:18px;">${data.room_id || 'N/A'}</strong><button onclick="copyText('td-room-id')" style="background:var(--primary); color:white; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="fas fa-copy"></i> Copy</button></div></div><div class="fp-row" style="margin-bottom:0; align-items:center;"><span>Password:</span><div style="display:flex; align-items:center; gap:8px;"><strong id="td-room-pass" style="user-select:all; font-size:18px;">${data.room_pass || 'N/A'}</strong><button onclick="copyText('td-room-pass')" style="background:var(--primary); color:white; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="fas fa-copy"></i> Copy</button></div></div></div>`;
        } else {
            roomBox.innerHTML = `<div class="fp-box" style="background: rgba(255, 149, 0, 0.1); border: 1px solid rgba(255, 149, 0, 0.3); margin-bottom: 20px;"><h3 style="color: var(--warning); margin-bottom:5px; font-size: 15px;"><i class="fas fa-lock"></i> Room Details Hidden</h3><p style="font-size:12px; font-weight:600;">Admin will reveal before the match.</p></div>`;
        }
    } else {
        roomBox.innerHTML = '';
        if(data.status === 'soon') { mainBtn.disabled = true; btnText.innerText = "Match Starts Soon"; }
        else { mainBtn.disabled = false; btnText.innerText = `Join Tournament (₹${window.currentEntryFee})`; }
    }
    document.getElementById('tournament-detail-page').style.display = 'flex';
}
window.openTournamentDetail = openTournamentDetail;

function closeTournamentDetail() { document.getElementById('tournament-detail-page').style.display = 'none'; window.currentTID = null; }
window.closeTournamentDetail = closeTournamentDetail;

function viewJoinedPlayers(tid) {
    const data = allTournamentsData[tid];
    if(!data) return;
    const container = document.getElementById('players-list-container');
    container.innerHTML = '';
    let joinedList = data.joinedPlayers ? Object.entries(data.joinedPlayers).map(([k,v]) => ({...v, phone: k})) : [];
    if(joinedList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No players joined yet.</div>';
    } else {
        joinedList.forEach((player, index) => {
            container.innerHTML += `<div class="player-list-item"><div class="pl-num">#${index + 1}</div><div class="pl-av" style="background-image:url('${player.avatar}')"></div><div class="pl-info"><h5>${player.ffName}</h5><p>UID: ${player.ffUid} | +91 ${player.phone || 'N/A'}</p></div></div>`;
        });
    }
    openModal('joined-players-modal');
}
window.viewJoinedPlayers = viewJoinedPlayers;

function startGlobalTimer() {
    if(globalTimerInterval) return;
    globalTimerInterval = setInterval(() => {
        const now = new Date().getTime();
        document.querySelectorAll('.dynamic-timer').forEach(el => {
            const rawTime = el.getAttribute('data-time');
            if(!rawTime || rawTime === "undefined" || rawTime === "") { el.innerText = "Time TBA"; return; }
            const diff = new Date(rawTime).getTime() - now;
            if(diff < 0) { el.innerText = "Match Started"; }
            else {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                el.innerText = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
            }
        });
    }, 1000);
}

function initiateJoin(btn) {
    if(window.userBalance < window.currentEntryFee) { showToast("Insufficient Balance!", "error"); closeTournamentDetail(); navigateTo('/wallet.html'); return; }
    document.getElementById('jf-entry-fee').innerText = window.currentEntryFee;
    document.getElementById('join-form-modal').style.display = 'flex';
}
window.initiateJoin = initiateJoin;

async function confirmJoin(btn) {
    const uid = document.getElementById('ff-uid').value;
    const name = document.getElementById('ff-name').value;
    if(!uid || !name) { showToast("Enter FF Details!", "error"); return; }
    btnLoading(btn, true);
    try {
        const data = await apiFetch(`/api/tournaments/${window.currentTID}/join`, { method: 'POST', body: JSON.stringify({ ffName: name, ffUid: uid }) });
        window.userBalance = data.balance;
        showToast("Joined Tournament Successfully!");
        btnLoading(btn, false); forceCloseModal('join-form-modal'); closeTournamentDetail();
        renderMatchesTournaments();
    } catch(e) { showToast(e.message, "error"); }
    btnLoading(btn, false);
}
window.confirmJoin = confirmJoin;

document.addEventListener('DOMContentLoaded', () => {
    window.currentTID = null; window.currentEntryFee = 0;
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadHeader();
        initMatchesData();
    } else { window.location.href = '/home.html'; }
});
