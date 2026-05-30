let allTournamentsData = {};
let myJoinedTournaments = new Set();
let globalTimerInterval = null;

async function initHomeData() {
    if(!window.userToken) return;

    // Check if profile is complete
    try {
        const profileStatus = await apiFetch('/api/auth/profile-status');
        if (!profileStatus.isComplete) {
            // Profile incomplete - show popup, lock it
            document.getElementById('profile-complete-popup').style.display = 'flex';
            if (profileStatus.user.name) document.getElementById('pc-name').value = profileStatus.user.name;
            return; // Don't load data until profile is complete
        }
    } catch(e) { console.error(e); }

    loadHomeData();
}

async function loadHomeData() {
    try {
        const user = await apiFetch('/api/auth/user');
        window.userBalance = user.balance || 0;
        const headerBal = document.getElementById('header-bal');
        if(headerBal) headerBal.innerText = window.userBalance;
    } catch(e) { console.error(e); }

    try {
        const settings = await apiFetch('/api/settings');
        window.adminSettings = settings;
    } catch(e) {}

    // Load header (app logo, name, user avatar)
    loadHeader();

    loadHomeTournaments();
    loadPolls();
}

// Save profile - popup won't close until done
async function saveFullProfile() {
    const name = document.getElementById('pc-name').value.trim();
    const phone = document.getElementById('pc-phone').value.trim();
    const ffName = document.getElementById('pc-ffname').value.trim();
    const ffUid = document.getElementById('pc-ffuid').value.trim();

    // Validation - all required
    if(!name) { showToast("Name is required!", "error"); return; }
    if(!phone || phone.length !== 10) { showToast("Enter valid 10-digit phone number!", "error"); return; }
    if(!ffName) { showToast("FF Name is required!", "error"); return; }
    if(!ffUid) { showToast("FF UID is required!", "error"); return; }

    const btn = document.querySelector('#profile-complete-popup .btn');
    btnLoading(btn, true);

    try {
        const result = await apiFetch('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, phone, ffName, ffUid })
        });
        // Update local storage
        const savedUser = JSON.parse(localStorage.getItem('arena_user') || '{}');
        savedUser.name = name;
        savedUser.phone = phone;
        savedUser.ff_name = ffName;
        savedUser.ff_uid = ffUid;
        localStorage.setItem('arena_user', JSON.stringify(savedUser));

        showToast("Profile saved! Welcome " + name + "!");

        // Close popup
        document.getElementById('profile-complete-popup').style.display = 'none';

        // Now load data
        loadHomeData();

    } catch(e) {
        console.error("Profile save error:", e);
        showToast(e.message, "error");
    }
    btnLoading(btn, false);
}

async function loadHomeTournaments() {
    const container = document.getElementById('home-tournaments-list');
    if(!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Loading...</div>';

    try {
        const tournaments = await apiFetch('/api/tournaments');
        const txs = await apiFetch('/api/transactions');
        myJoinedTournaments.clear();
        txs.forEach(tx => {
            if(tx.status === 'Success' && tx.type === 'Join Fee' && tx.tournament_id) {
                myJoinedTournaments.add(String(tx.tournament_id));
            }
        });

        container.innerHTML = '';
        allTournamentsData = {};
        tournaments.forEach(t => {
            allTournamentsData[t.id] = t;
            if(t.status !== "completed") {
                let badgeHtml = t.status === "live"
                    ? `<div class="t-badge-live"><div class="dot dot-success"></div> Live (Open)</div>`
                    : `<div class="t-badge-live" style="background:rgba(255,149,0,0.8);"><div class="dot dot-warning"></div> Starts Soon</div>`;

                let joinedCount = t.joinedPlayers ? Object.keys(t.joinedPlayers).length : 0;
                const totalTarget = t.target || 50;

                        container.innerHTML += `
                            <div class="tournament-card">
                                <div class="t-img-box" onclick="openTournamentDetail('${t.id}')">${badgeHtml}<div class="t-map-badge"><i class="fas fa-map-marked-alt"></i> ${t.map}</div><img src="${t.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22200%22%3E%3Crect fill=%22%23007aff%22 width=%22500%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22 font-weight=%22bold%22%3EArena Tournament%3C/text%3E%3C/svg%3E'}" class="t-img" alt="Cover"></div>
                                <div class="t-info">
                                    <div class="t-title" onclick="openTournamentDetail('${t.id}')">${t.title}</div>
                                    <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                                        <div class="match-time-pill timer-high" onclick="openTournamentDetail('${t.id}')">
                                            <i class="far fa-clock"></i> 
                                            <span class="dynamic-timer" data-time="${t.raw_time_obj}">--h --m --s</span>
                                        </div>
                                        <div style="background:rgba(0,122,255,0.1); color:var(--primary); padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700; display:flex; align-items:center; gap:4px;"><i class="fas fa-users"></i> ${t.type || 'Solo'}</div>
                                    </div>
                            <div class="t-stats" onclick="openTournamentDetail('${t.id}')">
                                <div class="t-stat-box"><span>Entry Fee</span><strong>₹${t.entry}</strong></div>
                                <div class="t-stat-box"><span>Prize Pool</span><strong class="prize-text">₹${t.prize}</strong></div>
                                <div class="t-stat-box"><span>Per Kill</span><strong>₹${t.kill}</strong></div>
                            </div>
                            <div class="joined-players-ui" onclick="viewJoinedPlayers('${t.id}')">
                                <div class="jp-avatars">
                                    <div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${t.id}1')"></div>
                                    <div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${t.id}2')"></div>
                                    <div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${t.id}3')"></div>
                                </div>
                                <div class="jp-text"><strong>${joinedCount}/${totalTarget}</strong> Players Joined <i class="fas fa-chevron-right" style="margin-left:5px; font-size:10px;"></i></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        if(!container.innerHTML) container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Active Tournaments</div>';
        startGlobalTimer();
    } catch(e) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Active Tournaments</div>';
    }
}

async function loadPolls() {
    const container = document.getElementById('home-polls-list');
    if(!container) return;

    try {
        const polls = await apiFetch('/api/polls');
        container.innerHTML = '';

        polls.forEach(poll => {
            if(poll.status === 'active') {
                let totalVotes = poll.votes ? Object.keys(poll.votes).length : 0;
                let userVotedOpt = poll.votes ? poll.votes[window.loggedInPhone] : null;
                const voteCounts = {};
                if(poll.options) Object.keys(poll.options).forEach(k => voteCounts[k] = 0);
                if(poll.votes) Object.values(poll.votes).forEach(opt => { voteCounts[opt] = (voteCounts[opt] || 0) + 1; });

                let optionsHtml = '';
                if(poll.options) {
                    Object.keys(poll.options).forEach(optKey => {
                        const optText = poll.options[optKey];
                        const votesForOpt = voteCounts[optKey] || 0;
                        const percent = totalVotes > 0 ? Math.round((votesForOpt / totalVotes) * 100) : 0;

                        if(userVotedOpt) {
                            optionsHtml += `<div class="poll-option ${userVotedOpt === optKey ? 'voted' : ''}"><div class="poll-fill" style="width: ${percent}%;"></div><div class="poll-opt-text">${optText} <i class="fas fa-check-circle poll-voted-mark"></i></div><div class="poll-opt-percent">${percent}%</div></div>`;
                        } else {
                            optionsHtml += `<div class="poll-option" onclick="submitVote('${poll.id}', '${optKey}')"><div class="poll-opt-text">${optText}</div><div class="poll-opt-percent" style="color:var(--text-muted); font-size:11px; font-weight:600;">Tap to Vote</div></div>`;
                        }
                    });
                }

                container.innerHTML += `<div class="poll-card"><div class="poll-header"><div class="poll-icon"><i class="fas fa-chart-bar"></i></div><div class="poll-question">${poll.question}</div></div><div class="poll-options">${optionsHtml}</div><div style="text-align:right; font-size:11px; color:var(--text-muted); margin-top:12px; font-weight:600;">${totalVotes} Total Votes</div></div>`;
            }
        });
    } catch(e) {}
}

async function submitVote(pollId, optionKey) {
    if(!window.loggedInPhone) return;
    try {
        await apiFetch(`/api/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionKey }) });
        showToast("Your vote has been submitted!");
        loadPolls();
    } catch(e) { showToast("Failed to submit vote", "error"); }
}
window.submitVote = submitVote;

function startGlobalTimer() {
    if(globalTimerInterval) return;
    globalTimerInterval = setInterval(() => {
        const now = new Date().getTime();
        document.querySelectorAll('.dynamic-timer').forEach(el => {
            const rawTime = el.getAttribute('data-time');
            if(!rawTime || rawTime === "undefined" || rawTime === "") {
                el.innerText = "Time TBA";
                let parent = el.closest('.match-time-pill');
                if(parent) parent.className = "match-time-pill timer-med";
                return;
            }
            const targetTime = new Date(rawTime).getTime();
            const diff = targetTime - now;
            if(diff < 0) {
                el.innerText = "Match Started";
                let parent = el.closest('.match-time-pill');
                if(parent) parent.className = "match-time-pill timer-low";
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                el.innerText = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
                let parent = el.closest('.match-time-pill');
                if(parent) {
                    if(diff > 7200000) parent.className = "match-time-pill timer-high";
                    else if(diff > 1800000) parent.className = "match-time-pill timer-med";
                    else parent.className = "match-time-pill timer-low";
                }
            }
        });
    }, 1000);
}

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
    document.getElementById('td-full-rules').innerText = data.rules || 'Play fair. No hacks.';
    document.getElementById('td-live-timer-text').setAttribute('data-time', data.raw_time_obj || "");

    document.getElementById('td-full-joined-ui').innerHTML = `<div class="joined-players-ui" onclick="viewJoinedPlayers('${tid}')"><div class="jp-avatars"><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}1')"></div><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}2')"></div><div class="jp-av" style="background-image:url('https://api.dicebear.com/7.x/avataaars/svg?seed=${tid}3')"></div></div><div class="jp-text"><strong>${joinedCount}/${totalTarget}</strong> Players Joined</div></div>`;

    const roomBox = document.getElementById('td-room-details');
    const mainBtn = document.getElementById('main-join-btn');
    const btnText = mainBtn.querySelector('.btn-text');
    mainBtn.classList.remove('btn-joined');

    if(myJoinedTournaments.has(String(tid))) {
        mainBtn.disabled = true; mainBtn.classList.add('btn-joined'); btnText.innerHTML = "<i class='fas fa-check-circle'></i> Already Joined";
        if(data.showRoom) {
            roomBox.innerHTML = `<div class="fp-box" style="background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); margin-bottom: 20px;"><h3 style="color: var(--success); margin-bottom:10px; font-size: 15px;"><i class="fas fa-key"></i> Room Details</h3><div class="fp-row" style="align-items:center;"><span>Room ID:</span><div style="display:flex; align-items:center; gap:8px;"><strong id="td-room-id" style="user-select:all; color:var(--text-main); font-size:18px;">${data.room_id || 'N/A'}</strong><button onclick="copyText('td-room-id')" style="background:var(--primary); color:white; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="fas fa-copy"></i> Copy</button></div></div><div class="fp-row" style="margin-bottom:0; align-items:center;"><span>Password:</span><div style="display:flex; align-items:center; gap:8px;"><strong id="td-room-pass" style="user-select:all; color:var(--text-main); font-size:18px;">${data.room_pass || 'N/A'}</strong><button onclick="copyText('td-room-pass')" style="background:var(--primary); color:white; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="fas fa-copy"></i> Copy</button></div></div></div>`;
        } else {
            roomBox.innerHTML = `<div class="fp-box" style="background: rgba(255, 149, 0, 0.1); border: 1px solid rgba(255, 149, 0, 0.3); margin-bottom: 20px;"><h3 style="color: var(--warning); margin-bottom:5px; font-size: 15px;"><i class="fas fa-lock"></i> Room Details Hidden</h3><p style="font-size:12px; color:var(--text-main); font-weight:600;">Admin will reveal before the match starts.</p></div>`;
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

function initiateJoin(btn) {
    if(window.userBalance < window.currentEntryFee) { showToast("Insufficient Balance!", "error"); closeTournamentDetail();         navigateTo('/user/wallet.html'); return; }
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
        const data = await apiFetch(`/api/tournaments/${window.currentTID}/join`, {
            method: 'POST', body: JSON.stringify({ ffName: name, ffUid: uid })
        });
        window.userBalance = data.balance;
        showToast("Joined Tournament Successfully!");
        btnLoading(btn, false); forceCloseModal('join-form-modal'); closeTournamentDetail();
        document.getElementById('ff-uid').value=''; document.getElementById('ff-name').value='';
        navigateTo('/user/matches.html');
    } catch(e) {
        showToast(e.message, "error");
    }
    btnLoading(btn, false);
}
window.confirmJoin = confirmJoin;

document.addEventListener('DOMContentLoaded', () => {
    window.currentTID = null;
    window.currentEntryFee = 0;
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initHomeData();
    } else {
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});
