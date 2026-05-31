function switchMatchTab(type) {
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.match-list').forEach(list => list.classList.remove('active'));
    document.getElementById('list-' + type).classList.add('active');
}
window.switchMatchTab = switchMatchTab;

async function initMatchesData() {
    var uid = FB.getCurrentUid();
    if(!uid) return;
    try {
        var user = await FB.getUser(uid);
        window.userBalance = user.balance || 0;
        document.getElementById('header-bal').innerText = window.userBalance;
    } catch(e) {}
    renderMatchesTournaments();
}

async function renderMatchesTournaments() {
    var upcomingContainer = document.getElementById('list-upcoming');
    var completedContainer = document.getElementById('list-completed');
    try {
        var tournaments = await FB.getTournaments();
        var txs = await FB.getTransactions(FB.getCurrentUid());
        myJoinedTournaments.clear();
        allTournamentsData = {};
        txs.forEach(function(tx) { if(tx.status === 'Success' && tx.type === 'Join Fee' && tx.tournament_id) myJoinedTournaments.add(String(tx.tournament_id)); });

        var joinedHtml = '', completedHtml = '';
        tournaments.forEach(function(t) {
            allTournamentsData[t.id] = t;
            if(t.status !== "completed") {
                if(myJoinedTournaments.has(String(t.id)) || t.status === "soon") {
                    var statusClass = myJoinedTournaments.has(String(t.id)) ? "badge-joined" : "badge-soon";
                    var statusText = myJoinedTournaments.has(String(t.id)) ? "Joined Successfully" : "Starts Soon";
                    joinedHtml += '<div class="premium-match-card" onclick="openTournamentDetail(\'' + t.id + '\')"><img src="' + (t.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23007aff' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EArena%3C/text%3E%3C/svg%3E") + '" class="pmc-img"><div class="pmc-info"><h4>' + t.title + '</h4><p style="margin-bottom:8px;"><i class="far fa-clock"></i> <span class="dynamic-timer" data-time="' + (t.raw_time_obj || '') + '">--h --m --s</span> <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700; margin-left:6px;">' + (t.type || 'Solo') + '</span></p><div class="pmc-badge ' + statusClass + '">' + statusText + '</div></div></div>';
                }
            } else {
                if(myJoinedTournaments.has(String(t.id))) {
                    completedHtml += '<div class="premium-match-card" onclick="openTournamentDetail(\'' + t.id + '\')"><img src="' + (t.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23007aff' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EArena%3C/text%3E%3C/svg%3E") + '" class="pmc-img"><div class="pmc-info"><h4>' + t.title + '</h4><p>Completed <span style="background:rgba(0,122,255,0.1); color:var(--primary); padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700; margin-left:6px;">' + (t.type || 'Solo') + '</span></p><div class="pmc-badge" style="background:rgba(0,122,255,0.1); color:var(--primary);">View Result</div></div></div>';
                }
            }
        });
        if(!joinedHtml) joinedHtml = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">No joined matches yet</div>';
        if(!completedHtml) completedHtml = '<div style="text-align:center; padding: 20px; color:var(--text-muted);">No completed matches</div>';
        upcomingContainer.innerHTML = joinedHtml;
        completedContainer.innerHTML = completedHtml;
    } catch(e) {}
}
