// Direct Firestore reads - Backend se direct, fast loading

async function fsGetTournaments() {
    const snap = await db.collection('tournaments').get();
    const playersSnap = await db.collection('joined_players').get();

    const allPlayers = {};
    playersSnap.forEach(p => {
        const pd = p.data();
        if (!allPlayers[pd.tournament_id]) allPlayers[pd.tournament_id] = {};
        allPlayers[pd.tournament_id][pd.user_id] = { ffName: pd.ff_name, ffUid: pd.ff_uid, avatar: pd.avatar };
    });

    const result = [];
    snap.forEach(doc => {
        const t = doc.data();
        result.push({ id: doc.id, ...t, joinedPlayers: allPlayers[doc.id] || {}, showRoom: !!t.show_room });
    });
    return result;
}
window.fsGetTournaments = fsGetTournaments;

async function fsGetPolls() {
    const [pSnap, vSnap] = await Promise.all([
        db.collection('polls').get(),
        db.collection('poll_votes').get()
    ]);

    const allVotes = {};
    vSnap.forEach(v => {
        const vd = v.data();
        if (!allVotes[vd.poll_id]) allVotes[vd.poll_id] = {};
        allVotes[vd.poll_id][vd.user_id] = vd.option_key;
    });

    const result = [];
    pSnap.forEach(doc => {
        const p = doc.data();
        result.push({ id: doc.id, question: p.question, status: p.status, options: p.options || {}, votes: allVotes[doc.id] || {} });
    });
    return result;
}
window.fsGetPolls = fsGetPolls;

async function fsGetSettings() {
    const snap = await db.collection('settings').get();
    const s = {};
    snap.forEach(doc => { s[doc.id] = doc.data().value; });
    return s;
}
window.fsGetSettings = fsGetSettings;

async function fsGetUser(userId) {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}
window.fsGetUser = fsGetUser;

async function fsGetUserTransactions(userId) {
    const snap = await db.collection('transactions').where('user_id', '==', userId).get();
    const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    txs.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
    return txs;
}
window.fsGetUserTransactions = fsGetUserTransactions;

async function fsVotePoll(pollId, userId, optionKey) {
    await db.collection('poll_votes').doc(pollId + '_' + userId).set({
        poll_id: pollId, user_id: userId, option_key: optionKey
    });
}
window.fsVotePoll = fsVotePoll;
