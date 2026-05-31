async function initRankData() {
    if(!window.userToken) return;
    try { await apiFetch('/api/auth/user'); } catch(e) {}
    renderRankTournaments();
}

async function renderRankTournaments() {
    const rankContainer = document.getElementById('rank-tournaments-list');
    if(!rankContainer) return;

    try {
        const tournaments = await apiFetch('/api/tournaments');
        let rankHtml = '';
        tournaments.forEach(t => {
            if(t.status === "completed") {
                let wName = t.winner_name || "";
                let wUid = t.winner_uid || "";
                let winnerHtml = `<div class="no-result-text">Rank details updating soon...</div>`;
                if(wName && wUid) {
                    winnerHtml = `<div class="rc-winner"><div class="rcw-crown"><i class="fas fa-crown"></i></div><div class="rcw-details"><p>#1 Winner</p><h3>${wName}</h3><span>UID: ${wUid}</span></div></div>`;
                }
                const displayTime = formatOnlyTime(t.raw_time_obj);
                rankHtml += `<div class="rc-card"><div class="rc-header"><img src="${t.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23007aff%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22 font-weight=%22bold%22%3EArena%3C/text%3E%3C/svg%3E'}" class="rc-img"><div class="rc-info"><h4>${t.title}</h4><div class="rc-map"><i class="fas fa-map-marked-alt"></i> ${t.map} <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 6px; border-radius:6px; font-size:10px; font-weight:700; margin-left:4px;">${t.type || 'Solo'}</span></div><div class="rc-time"><i class="far fa-clock"></i> ${displayTime}</div></div><div class="rc-status">Completed</div></div><div class="rc-stats"><div><span>Entry</span><strong>₹${t.entry || '0'}</strong></div><div><span>Prize Pool</span><strong style="color:var(--success);">₹${t.prize || '0'}</strong></div><div><span>Per Kill</span><strong style="color:var(--primary);">₹${t.kill || '0'}</strong></div></div>${winnerHtml}</div>`;
            }
        });
        if(!rankHtml) rankHtml = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Results Yet</div>';
        rankContainer.innerHTML = rankHtml;
    } catch(e) {
        rankContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Results Yet</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(window.userToken) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadHeader();
        initRankData();
    } else { window.location.href = '/home.html'; }
});
