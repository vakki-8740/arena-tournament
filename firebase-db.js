// ================================================
// FIREBASE DATABASE - Direct Firestore Operations
// No backend server needed
// ================================================

const FB = {
    // ==================== AUTH ====================
    async googleLogin() {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName || 'User',
                email: user.email || '',
                avatar: user.photoURL || '',
                phone: '', ff_name: '', ff_uid: '',
                balance: 0, status: 'Active',
                saved_upi: '', saved_bank: '',
                login_method: 'google',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        const data = (await db.collection('users').doc(user.uid).get()).data();
        localStorage.setItem('arena_uid', user.uid);
        return { uid: user.uid, ...data };
    },

    async registerPhone(name, phone, password) {
        const phoneSnap = await db.collection('users').where('phone', '==', phone).limit(1).get();
        if (!phoneSnap.empty) throw new Error('Already registered');

        const email = phone + '@arena.app';
        const cred = await auth.createUserWithEmailAndPassword(email, password);

        await db.collection('users').doc(cred.user.uid).set({
            name, phone, email, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}&backgroundColor=b6e3f4`,
            ff_name: '', ff_uid: '', balance: 0, status: 'Active',
            saved_upi: '', saved_bank: '', login_method: 'local',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        });

        localStorage.setItem('arena_uid', cred.user.uid);
        const data = (await db.collection('users').doc(cred.user.uid).get()).data();
        return { uid: cred.user.uid, ...data };
    },

    async loginPhone(phone, password) {
        const phoneSnap = await db.collection('users').where('phone', '==', phone).limit(1).get();
        if (phoneSnap.empty) throw new Error('Account not found');

        const userData = phoneSnap.docs[0].data();
        const email = userData.email || phone + '@arena.app';
        const cred = await auth.signInWithEmailAndPassword(email, password);

        localStorage.setItem('arena_uid', cred.user.uid);
        return { uid: cred.user.uid, ...userData };
    },

    logout() {
        auth.signOut();
        localStorage.removeItem('arena_uid');
    },

    getCurrentUid() {
        return localStorage.getItem('arena_uid');
    },

    // ==================== USERS ====================
    async getUser(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async updateUser(uid, data) {
        data.updated_at = new Date().toISOString();
        await db.collection('users').doc(uid).update(data);
    },

    async getAllUsers() {
        const snap = await db.collection('users').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async deleteUser(uid) {
        const batch = db.batch();
        const pv = await db.collection('poll_votes').where('user_id', '==', uid).get();
        pv.forEach(d => batch.delete(d.ref));
        const jp = await db.collection('joined_players').where('user_id', '==', uid).get();
        jp.forEach(d => batch.delete(d.ref));
        const tx = await db.collection('transactions').where('user_id', '==', uid).get();
        tx.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('users').doc(uid));
        await batch.commit();
    },

    // ==================== TOURNAMENTS ====================
    async getTournaments() {
        const [tSnap, pSnap] = await Promise.all([
            db.collection('tournaments').get(),
            db.collection('joined_players').get()
        ]);

        const allPlayers = {};
        pSnap.forEach(p => {
            const pd = p.data();
            if (!allPlayers[pd.tournament_id]) allPlayers[pd.tournament_id] = {};
            allPlayers[pd.tournament_id][pd.user_id] = { ffName: pd.ff_name, ffUid: pd.ff_uid, avatar: pd.avatar };
        });

        return tSnap.docs.map(d => ({ id: d.id, ...d.data(), joinedPlayers: allPlayers[d.id] || {}, showRoom: !!d.data().show_room }));
    },

    async createTournament(data) {
        const docRef = await db.collection('tournaments').add({
            image: data.image || '', title: data.title, map: data.map || 'Bermuda',
            type: data.type || 'Solo', status: data.status || 'live',
            entry: data.entry || 0, prize: data.prize || 0, kill: data.kill || 0,
            time: data.time || 'TBA', raw_time_obj: data.rawTimeObj || '',
            target: data.target || 50, room_id: data.roomId || '', room_pass: data.roomPass || '',
            show_room: !!data.showRoom, winner_name: data.winnerName || '',
            winner_uid: data.winnerUid || '', rules: data.rules || '',
            created_at: new Date().toISOString()
        });
        return docRef.id;
    },

    async updateTournament(id, data) {
        await db.collection('tournaments').doc(id).update({
            image: data.image || '', title: data.title, map: data.map,
            type: data.type || 'Solo', status: data.status,
            entry: data.entry || 0, prize: data.prize || 0, kill: data.kill || 0,
            time: data.time || 'TBA', raw_time_obj: data.rawTimeObj || '',
            target: data.target || 50, room_id: data.roomId || '', room_pass: data.roomPass || '',
            show_room: !!data.showRoom, winner_name: data.winnerName || '',
            winner_uid: data.winnerUid || '', rules: data.rules || ''
        });
    },

    async deleteTournament(id) {
        const batch = db.batch();
        const jp = await db.collection('joined_players').where('tournament_id', '==', id).get();
        jp.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('tournaments').doc(id));
        await batch.commit();
    },

    async joinTournament(tid, uid, ffName, ffUid) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) throw new Error('User not found');
        const user = userDoc.data();

        const tDoc = await db.collection('tournaments').doc(tid).get();
        if (!tDoc.exists) throw new Error('Tournament not found');
        const tournament = tDoc.data();

        if ((user.balance || 0) < tournament.entry) throw new Error('Insufficient balance');

        const existing = await db.collection('joined_players').where('tournament_id', '==', tid).where('user_id', '==', uid).limit(1).get();
        if (!existing.empty) throw new Error('Already joined');

        const newBal = (user.balance || 0) - tournament.entry;
        await db.collection('users').doc(uid).update({ balance: newBal });
        await db.collection('joined_players').add({
            tournament_id: tid, user_id: uid, ff_name: ffName, ff_uid: ffUid,
            avatar: user.avatar, joined_at: new Date().toISOString()
        });
        await db.collection('transactions').add({
            user_id: uid, type: 'Join Fee', amount: tournament.entry, utr: '', upi: '',
            tournament_id: tid, status: 'Success', datetime: new Date().toISOString()
        });

        return { balance: newBal };
    },

    // ==================== TRANSACTIONS ====================
    async getTransactions(uid) {
        const snap = await db.collection('transactions').where('user_id', '==', uid).get();
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
        return txs;
    },

    async getAllTransactions() {
        const snap = await db.collection('transactions').get();
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
        return txs;
    },

    async submitDeposit(uid, amount, utr) {
        const userDoc = await db.collection('users').doc(uid).get();
        const user = userDoc.data();
        await db.collection('transactions').add({
            user_id: uid, type: 'Deposit', amount, utr, upi: '',
            tournament_id: null, status: 'Pending', datetime: new Date().toISOString()
        });
        return { name: user.name, phone: user.phone, email: user.email };
    },

    async submitWithdraw(uid, amount, method) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) throw new Error('User not found');
        const user = userDoc.data();

        if (amount < 100) throw new Error('Min ₹100');
        if ((user.balance || 0) < amount) throw new Error('Insufficient balance');

        const newBal = (user.balance || 0) - amount;
        await db.collection('users').doc(uid).update({ balance: newBal });
        await db.collection('transactions').add({
            user_id: uid, type: 'Withdraw', amount, utr: '', upi: method || '',
            tournament_id: null, status: 'Pending', datetime: new Date().toISOString()
        });

        return { balance: newBal, name: user.name, phone: user.phone, email: user.email };
    },

    async updateTransaction(txId, status) {
        const txDoc = await db.collection('transactions').doc(txId).get();
        if (!txDoc.exists) throw new Error('Not found');
        const tx = txDoc.data();

        await db.collection('transactions').doc(txId).update({ status });

        if (status === 'Success' && tx.type === 'Deposit') {
            const uDoc = await db.collection('users').doc(tx.user_id).get();
            const bal = uDoc.exists ? (uDoc.data().balance || 0) : 0;
            await db.collection('users').doc(tx.user_id).update({ balance: bal + tx.amount });
        } else if (status === 'Rejected' && tx.type === 'Withdraw') {
            const uDoc = await db.collection('users').doc(tx.user_id).get();
            const bal = uDoc.exists ? (uDoc.data().balance || 0) : 0;
            await db.collection('users').doc(tx.user_id).update({ balance: bal + tx.amount });
        }
    },

    // ==================== POLLS ====================
    async getPolls() {
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

        return pSnap.docs.map(d => {
            const p = d.data();
            return { id: d.id, question: p.question, status: p.status, options: p.options || {}, votes: allVotes[d.id] || {} };
        });
    },

    async createPoll(question, status, options) {
        const docRef = await db.collection('polls').add({
            question, status: status || 'active', options: options || {},
            created_at: new Date().toISOString()
        });
        return docRef.id;
    },

    async updatePoll(id, question, status, options) {
        await db.collection('polls').doc(id).update({ question, status, options: options || {} });
    },

    async deletePoll(id) {
        const batch = db.batch();
        const pv = await db.collection('poll_votes').where('poll_id', '==', id).get();
        pv.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('polls').doc(id));
        await batch.commit();
    },

    async votePoll(pollId, uid, optionKey) {
        await db.collection('poll_votes').doc(pollId + '_' + uid).set({
            poll_id: pollId, user_id: uid, option_key: optionKey
        });
    },

    // ==================== SETTINGS ====================
    async getSettings() {
        const snap = await db.collection('settings').get();
        const s = {};
        snap.forEach(doc => { s[doc.id] = doc.data().value; });
        return s;
    },

    async updateSettings(data) {
        const batch = db.batch();
        Object.entries(data).forEach(([key, value]) => {
            batch.set(db.collection('settings').doc(key), { value: String(value) });
        });
        await batch.commit();
    },

    // ==================== STATS ====================
    async getStats() {
        const [usersSnap, txSnap, tSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('transactions').get(),
            db.collection('tournaments').get()
        ]);

        let deposits = 0, withdrawals = 0, activeTournaments = 0;
        txSnap.forEach(d => {
            const t = d.data();
            if (t.type === 'Deposit' && t.status === 'Success') deposits += t.amount || 0;
            if (t.type === 'Withdraw' && t.status === 'Success') withdrawals += t.amount || 0;
        });
        tSnap.forEach(d => { if (d.data().status !== 'completed') activeTournaments++; });

        return { users: usersSnap.size, deposits, withdrawals, tournaments: activeTournaments };
    }
};

window.FB = FB;
