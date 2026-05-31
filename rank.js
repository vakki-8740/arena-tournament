async function initRankData() {
    var uid = FB.getCurrentUid();
    if(!uid) return;
    renderRankTournaments();
}

async function renderRankTournaments() {
    var rankContainer = document.getElementById('rank-tournaments-list');
    if(!rankContainer) return;
    try {
        var tournaments = await FB.getTournaments();
        var rankHtml = '';
        tournaments.forEach(function(t) {
            if(t.status === "completed") {
                var winnerHtml = '<div class="no-result-text">Rank details updating soon...</div>';
                if(t.winner_name && t.winner_uid) {
                    winnerHtml = '<div class="rc-winner"><div class="rcw-crown"><i class="fas fa-crown"></i></div><div class="rcw-details"><p>#1 Winner</p><h3>' + t.winner_name + '</h3><span>UID: ' + t.winner_uid + '</span></div></div>';
                }
                var displayTime = formatOnlyTime(t.raw_time_obj);
                rankHtml += '<div class="rc-card"><div class="rc-header"><img src="' + (t.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23007aff' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EArena%3C/text%3E%3C/svg%3E") + '" class="rc-img"><div class="rc-info"><h4>' + t.title + '</h4><div class="rc-map"><i class="fas fa-map-marked-alt"></i> ' + t.map + ' <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 6px; border-radius:6px; font-size:10px; font-weight:700; margin-left:4px;">' + (t.type || 'Solo') + '</span></div><div class="rc-time"><i class="far fa-clock"></i> ' + displayTime + '</div></div><div class="rc-status">Completed</div></div><div class="rc-stats"><div><span>Entry</span><strong>₹' + (t.entry || '0') + '</strong></div><div><span>Prize Pool</span><strong style="color:var(--success);">₹' + (t.prize || '0') + '</strong></div><div><span>Per Kill</span><strong style="color:var(--primary);">₹' + (t.kill || '0') + '</strong></div></div>' + winnerHtml + '</div>';
            }
        });
        if(!rankHtml) rankHtml = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Results Yet</div>';
        rankContainer.innerHTML = rankHtml;
    } catch(e) { rankContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No Results Yet</div>'; }
}
