const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initDatabase, db } = require('./database');
const { alertDeposit, alertWithdraw, alertNewUser, alertTournamentJoin } = require('./telegram');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'arena_tournament_secret_key_2026';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

function nowStr() { return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); }

async function getSettings() {
    const snap = await db().collection('settings').get();
    const s = {};
    snap.forEach(doc => { s[doc.id] = doc.data().value; });
    return s;
}

// ==================== MIDDLEWARES ====================

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

function adminMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.phone !== 'admin') return res.status(403).json({ error: 'Admin only' });
        req.user = decoded;
        next();
    } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

// ==================== GOOGLE AUTH ====================

app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ error: 'No ID token' });

        let decoded;
        try { decoded = await require('firebase-admin').auth().verifyIdToken(idToken); }
        catch {
            const parts = idToken.split('.');
            if (parts.length !== 3) return res.status(401).json({ error: 'Invalid token' });
            decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        }

        const googleId = decoded.uid || decoded.sub;
        const email = decoded.email || '';
        const name = decoded.name || email.split('@')[0] || 'User';
        const avatar = decoded.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${googleId}&backgroundColor=b6e3f4`;

        const snap = await db().collection('users').where('google_id', '==', googleId).limit(1).get();
        let userDoc, userData;

        if (!snap.empty) {
            userDoc = snap.docs[0];
            await userDoc.ref.update({ name, email, avatar });
            userData = { id: userDoc.id, ...userDoc.data(), name, email, avatar };
        } else {
            const docRef = await db().collection('users').add({
                phone: '', google_id: googleId, name, email, password: '', avatar,
                ff_name: '', ff_uid: '', balance: 0, status: 'Active',
                saved_upi: '', saved_bank: '', login_method: 'google',
                created_at: nowStr(), updated_at: nowStr()
            });
            userData = { id: docRef.id, phone: '', google_id: googleId, name, email, password: '', avatar, ff_name: '', ff_uid: '', balance: 0, status: 'Active', saved_upi: '', saved_bank: '', login_method: 'google' };
            const settings = await getSettings();
            alertNewUser(settings, { id: docRef.id, name, email, phone: '', loginMethod: 'Google' }).catch(e => console.log('Telegram error:', e.message));
        }

        const token = jwt.sign({ userId: userData.id, name: userData.name, email: userData.email }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userData.id, name: userData.name, email: userData.email, avatar: userData.avatar, balance: userData.balance || 0 } });
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// ==================== LOCAL AUTH ====================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        if (!name || !phone || !password) return res.status(400).json({ error: 'All fields required' });
        if (phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });

        const phoneSnap = await db().collection('users').where('phone', '==', phone).limit(1).get();
        if (!phoneSnap.empty) return res.status(400).json({ error: 'Already registered' });

        const bcrypt = require('bcryptjs');
        const hashedPass = bcrypt.hashSync(password, 10);
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}&backgroundColor=b6e3f4`;

        const docRef = await db().collection('users').add({
            phone, google_id: '', name, email: '', password: hashedPass, avatar,
            ff_name: '', ff_uid: '', balance: 0, status: 'Active',
            saved_upi: '', saved_bank: '', login_method: 'local',
            created_at: nowStr(), updated_at: nowStr()
        });

        const token = jwt.sign({ userId: docRef.id, phone, name }, JWT_SECRET, { expiresIn: '30d' });
        const settings = await getSettings();
        alertNewUser(settings, { id: docRef.id, name, email: '', phone, loginMethod: 'Phone' }).catch(e => console.log('Telegram error:', e.message));
        res.json({ token, user: { id: docRef.id, phone, name, avatar } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ error: 'All fields required' });

        const snap = await db().collection('users').where('phone', '==', phone).limit(1).get();
        if (snap.empty) return res.status(400).json({ error: 'Account not found' });

        const userDoc = snap.docs[0];
        const user = userDoc.data();
        const bcrypt = require('bcryptjs');
        if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Wrong password' });
        if (user.status === 'Blocked') return res.status(403).json({ error: 'Blocked by admin' });

        const token = jwt.sign({ userId: userDoc.id, phone: user.phone, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userDoc.id, phone: user.phone, name: user.name, avatar: user.avatar } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/user', authMiddleware, async (req, res) => {
    try {
        const doc = await db().collection('users').doc(req.user.userId).get();
        if (!doc.exists) return res.status(404).json({ error: 'User not found' });
        const u = doc.data();
        delete u.password;
        res.json({ id: doc.id, ...u });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
        const { name, ffName, ffUid, phone, savedUpi, savedBank } = req.body;
        const ref = db().collection('users').doc(req.user.userId);

        if (savedUpi !== undefined) { await ref.update({ saved_upi: savedUpi }); return res.json({ success: true }); }
        if (savedBank !== undefined) { await ref.update({ saved_bank: JSON.stringify(savedBank) }); return res.json({ success: true }); }

        const update = { name, ff_name: ffName || '', ff_uid: ffUid || '', updated_at: nowStr() };
        if (phone) {
            const phoneSnap = await db().collection('users').where('phone', '==', phone).limit(1).get();
            if (!phoneSnap.empty && phoneSnap.docs[0].id !== req.user.userId) return res.status(400).json({ error: 'Phone number already in use' });
            update.phone = phone;
        }
        await ref.update(update);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/profile-status', authMiddleware, async (req, res) => {
    try {
        const doc = await db().collection('users').doc(req.user.userId).get();
        if (!doc.exists) return res.status(404).json({ error: 'User not found' });
        const u = doc.data();
        const isComplete = u.phone && u.ff_name && u.ff_uid;
        res.json({ isComplete: !!isComplete, user: { name: u.name, phone: u.phone, ff_name: u.ff_name, ff_uid: u.ff_uid, email: u.email, avatar: u.avatar } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/auth/avatar', authMiddleware, async (req, res) => {
    try {
        const { avatar } = req.body;
        if (!avatar) return res.status(400).json({ error: 'No image data' });
        await db().collection('users').doc(req.user.userId).update({ avatar });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== TOURNAMENTS ====================

app.get('/api/tournaments', async (req, res) => {
    try {
        const tSnap = await db().collection('tournaments').get();
        const result = [];
        for (const tDoc of tSnap.docs) {
            const t = tDoc.data();
            const pSnap = await db().collection('joined_players').where('tournament_id', '==', tDoc.id).get();
            const joinedPlayers = {};
            pSnap.forEach(p => { const pd = p.data(); joinedPlayers[pd.user_id] = { ffName: pd.ff_name, ffUid: pd.ff_uid, avatar: pd.avatar }; });
            result.push({ id: tDoc.id, ...t, joinedPlayers, showRoom: !!t.show_room });
        }
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tournaments', adminMiddleware, async (req, res) => {
    try {
        const { image, title, map, type, status, entry, prize, kill, time, rawTimeObj, target, roomId, roomPass, showRoom, winnerName, winnerUid, rules } = req.body;
        if (!title) return res.status(400).json({ error: 'Title required' });
        const docRef = await db().collection('tournaments').add({
            image: image || '', title, map: map || 'Bermuda', type: type || 'Solo', status: status || 'live',
            entry: entry || 0, prize: prize || 0, kill: kill || 0, time: time || 'TBA', raw_time_obj: rawTimeObj || '',
            target: target || 50, room_id: roomId || '', room_pass: roomPass || '', show_room: !!showRoom,
            winner_name: winnerName || '', winner_uid: winnerUid || '', rules: rules || '',
            created_at: nowStr()
        });
        res.json({ id: docRef.id, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tournaments/:id', adminMiddleware, async (req, res) => {
    try {
        const { image, title, map, type, status, entry, prize, kill, time, rawTimeObj, target, roomId, roomPass, showRoom, winnerName, winnerUid, rules } = req.body;
        await db().collection('tournaments').doc(req.params.id).update({
            image: image || '', title, map, type: type || 'Solo', status,
            entry: entry || 0, prize: prize || 0, kill: kill || 0, time: time || 'TBA', raw_time_obj: rawTimeObj || '',
            target: target || 50, room_id: roomId || '', room_pass: roomPass || '', show_room: !!showRoom,
            winner_name: winnerName || '', winner_uid: winnerUid || '', rules: rules || ''
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tournaments/:id', adminMiddleware, async (req, res) => {
    try {
        const db_ = db();
        const pSnap = await db_.collection('joined_players').where('tournament_id', '==', req.params.id).get();
        const batch = db_.batch();
        pSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await db_.collection('tournaments').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tournaments/:id/join', authMiddleware, async (req, res) => {
    try {
        const { ffName, ffUid } = req.body;
        const tid = req.params.id;
        const db_ = db();

        const userDoc = await db_.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const user = userDoc.data();

        const tDoc = await db_.collection('tournaments').doc(tid).get();
        if (!tDoc.exists) return res.status(404).json({ error: 'Tournament not found' });
        const tournament = tDoc.data();

        if ((user.balance || 0) < tournament.entry) return res.status(400).json({ error: 'Insufficient balance' });

        const existing = await db_.collection('joined_players').where('tournament_id', '==', tid).where('user_id', '==', req.user.userId).limit(1).get();
        if (!existing.empty) return res.status(400).json({ error: 'Already joined' });

        const newBal = (user.balance || 0) - tournament.entry;
        await db_.collection('users').doc(req.user.userId).update({ balance: newBal });
        await db_.collection('joined_players').add({
            tournament_id: tid, user_id: req.user.userId, ff_name: ffName, ff_uid: ffUid, avatar: user.avatar, joined_at: nowStr()
        });
        await db_.collection('transactions').add({
            user_id: req.user.userId, type: 'Join Fee', amount: tournament.entry, utr: '', upi: '',
            tournament_id: tid, status: 'Success', datetime: nowStr()
        });

        const settings = await getSettings();
        alertTournamentJoin(settings,
            { id: req.user.userId, name: user.name, phone: user.phone, email: user.email, balance: newBal },
            { title: tournament.title, map: tournament.map, entry: tournament.entry, prize: tournament.prize, kill: tournament.kill },
            { ffName, ffUid }
        ).catch(e => console.log('Telegram error:', e.message));

        res.json({ success: true, balance: newBal });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== POLLS ====================

app.get('/api/polls', async (req, res) => {
    try {
        const snap = await db().collection('polls').get();
        const result = [];
        for (const pDoc of snap.docs) {
            const p = pDoc.data();
            const votesSnap = await db().collection('poll_votes').where('poll_id', '==', pDoc.id).get();
            const votes = {};
            votesSnap.forEach(v => { const vd = v.data(); votes[vd.user_id] = vd.option_key; });
            result.push({ id: pDoc.id, question: p.question, status: p.status, options: p.options || {}, votes });
        }
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/polls', adminMiddleware, async (req, res) => {
    try {
        const { question, status, options } = req.body;
        if (!question) return res.status(400).json({ error: 'Question required' });
        const docRef = await db().collection('polls').add({ question, status: status || 'active', options: options || {}, created_at: nowStr() });
        res.json({ id: docRef.id, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/polls/:id', adminMiddleware, async (req, res) => {
    try {
        const { question, status, options } = req.body;
        await db().collection('polls').doc(req.params.id).update({ question, status, options: options || {} });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/polls/:id', adminMiddleware, async (req, res) => {
    try {
        const db_ = db();
        const votesSnap = await db_.collection('poll_votes').where('poll_id', '==', req.params.id).get();
        const batch = db_.batch();
        votesSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await db_.collection('polls').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/polls/:id/vote', authMiddleware, async (req, res) => {
    try {
        const { optionKey } = req.body;
        const voteId = `${req.params.id}_${req.user.userId}`;
        await db().collection('poll_votes').doc(voteId).set({ poll_id: req.params.id, user_id: req.user.userId, option_key: optionKey });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== TRANSACTIONS ====================

app.get('/api/transactions', authMiddleware, async (req, res) => {
    try {
        const snap = await db().collection('transactions').where('user_id', '==', req.user.userId).get();
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
        res.json(txs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions/deposit', authMiddleware, async (req, res) => {
    try {
        const { amount, utr } = req.body;
        if (!amount || amount < 10) return res.status(400).json({ error: 'Min deposit ₹10' });
        if (!utr || utr.length !== 12) return res.status(400).json({ error: '12-digit UTR required' });

        await db().collection('transactions').add({
            user_id: req.user.userId, type: 'Deposit', amount, utr, upi: '',
            tournament_id: null, status: 'Pending', datetime: nowStr()
        });

        const userDoc = await db().collection('users').doc(req.user.userId).get();
        const user = userDoc.data();
        const settings = await getSettings();
        alertDeposit(settings, { id: req.user.userId, name: user.name, phone: user.phone, email: user.email }, amount, utr).catch(e => console.log('Telegram error:', e.message));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, method } = req.body;
        const db_ = db();
        const userDoc = await db_.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const user = userDoc.data();

        if (amount < 100) return res.status(400).json({ error: 'Min ₹100' });
        if ((user.balance || 0) < amount) return res.status(400).json({ error: 'Insufficient balance' });

        const newBal = (user.balance || 0) - amount;
        await db_.collection('users').doc(req.user.userId).update({ balance: newBal });
        await db_.collection('transactions').add({
            user_id: req.user.userId, type: 'Withdraw', amount, utr: '', upi: method || '',
            tournament_id: null, status: 'Pending', datetime: nowStr()
        });

        const settings = await getSettings();
        alertWithdraw(settings, { id: req.user.userId, name: user.name, phone: user.phone, email: user.email }, amount, method).catch(e => console.log('Telegram error:', e.message));
        res.json({ success: true, balance: newBal });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/transactions/:id', adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const db_ = db();
        const txDoc = await db_.collection('transactions').doc(req.params.id).get();
        if (!txDoc.exists) return res.status(404).json({ error: 'Not found' });
        const tx = txDoc.data();

        await db_.collection('transactions').doc(req.params.id).update({ status });

        if (status === 'Success' && tx.type === 'Deposit') {
            const uDoc = await db_.collection('users').doc(tx.user_id).get();
            const bal = uDoc.exists ? (uDoc.data().balance || 0) : 0;
            await db_.collection('users').doc(tx.user_id).update({ balance: bal + tx.amount });
        } else if (status === 'Rejected' && tx.type === 'Withdraw') {
            const uDoc = await db_.collection('users').doc(tx.user_id).get();
            const bal = uDoc.exists ? (uDoc.data().balance || 0) : 0;
            await db_.collection('users').doc(tx.user_id).update({ balance: bal + tx.amount });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/transactions/all', adminMiddleware, async (req, res) => {
    try {
        const snap = await db().collection('transactions').get();
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
        res.json(txs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== SETTINGS ====================

app.get('/api/settings', async (req, res) => {
    try { res.json(await getSettings()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', adminMiddleware, async (req, res) => {
    try {
        const batch = db().batch();
        Object.entries(req.body).forEach(([key, value]) => {
            batch.set(db().collection('settings').doc(key), { value: String(value) });
        });
        await batch.commit();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== ADMIN ====================

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const db_ = db();
        const usersSnap = await db_.collection('users').get();
        const txSnap = await db_.collection('transactions').get();
        const tSnap = await db_.collection('tournaments').get();

        const users = usersSnap.size;
        let deposits = 0, withdrawals = 0, activeTournaments = 0;
        txSnap.forEach(d => { const t = d.data(); if (t.type === 'Deposit' && t.status === 'Success') deposits += t.amount || 0; if (t.type === 'Withdraw' && t.status === 'Success') withdrawals += t.amount || 0; });
        tSnap.forEach(d => { if (d.data().status !== 'completed') activeTournaments++; });
        res.json({ users, deposits, withdrawals, tournaments: activeTournaments });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const snap = await db().collection('users').get();
        const users = snap.docs.map(d => {
            const u = d.data();
            return { id: d.id, phone: u.phone, name: u.name, email: u.email, avatar: u.avatar, balance: u.balance || 0, status: u.status, login_method: u.login_method };
        });
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/balance', adminMiddleware, async (req, res) => {
    try { await db().collection('users').doc(req.params.id).update({ balance: Number(req.body.balance) }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/status', adminMiddleware, async (req, res) => {
    try { await db().collection('users').doc(req.params.id).update({ status: req.body.status }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
        const db_ = db();
        const batch = db_.batch();
        const pv = await db_.collection('poll_votes').where('user_id', '==', req.params.id).get();
        pv.forEach(d => batch.delete(d.ref));
        const jp = await db_.collection('joined_players').where('user_id', '==', req.params.id).get();
        jp.forEach(d => batch.delete(d.ref));
        const tx = await db_.collection('transactions').where('user_id', '==', req.params.id).get();
        tx.forEach(d => batch.delete(d.ref));
        batch.delete(db_.collection('users').doc(req.params.id));
        await batch.commit();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'arena@gmail.com' && password === 'arena@freefire') {
        const token = jwt.sign({ phone: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } else { res.status(401).json({ error: 'Invalid credentials' }); }
});

// ==================== ROUTES ====================

app.get('/', (req, res) => { res.redirect('/site/index.html'); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html')); });
app.get('/admin/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'user', 'home.html')); });

// ==================== START ====================

async function startServer() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`Arena Tournament Server running on http://localhost:${PORT}`);
        console.log(`User Panel:  http://localhost:3000`);
        console.log(`Admin Panel: http://localhost:3000/admin`);
    });
}

startServer();
