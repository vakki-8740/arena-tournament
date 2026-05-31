const https = require('https');

// Telegram message bhejo
async function sendTelegramMessage(botToken, chatId, message) {
    if (!botToken || !chatId) return;

    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const postData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// Deposit alert
async function alertDeposit(settings, userData, amount, utr) {
    const msg = `
💰 <b>NEW DEPOSIT REQUEST</b>

👤 <b>User:</b> ${userData.name}
📱 <b>Phone:</b> ${userData.phone || 'N/A'}
📧 <b>Email:</b> ${userData.email || 'N/A'}
🆔 <b>User ID:</b> ${userData.id}

💵 <b>Amount:</b> ₹${amount}
🔢 <b>UTR:</b> ${utr}
📅 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

⚡ <b>Action Required:</b> Approve or Reject
    `.trim();

    await sendTelegramMessage(settings.telegramBotToken, settings.telegramPaymentChannel, msg);
}

// Withdraw alert
async function alertWithdraw(settings, userData, amount, method) {
    const msg = `
💸 <b>NEW WITHDRAWAL REQUEST</b>

👤 <b>User:</b> ${userData.name}
📱 <b>Phone:</b> ${userData.phone || 'N/A'}
📧 <b>Email:</b> ${userData.email || 'N/A'}
🆔 <b>User ID:</b> ${userData.id}

💵 <b>Amount:</b> ₹${method}
🏦 <b>Method:</b> ${method}
📅 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

⚡ <b>Action Required:</b> Approve or Reject
    `.trim();

    await sendTelegramMessage(settings.telegramBotToken, settings.telegramPaymentChannel, msg);
}

// New user alert
async function alertNewUser(settings, userData) {
    const msg = `
🆕 <b>NEW USER REGISTERED</b>

👤 <b>Name:</b> ${userData.name}
📱 <b>Phone:</b> ${userData.phone || 'Google User'}
📧 <b>Email:</b> ${userData.email || 'N/A'}
🆔 <b>User ID:</b> ${userData.id}
🔐 <b>Login Method:</b> ${userData.loginMethod || 'Google'}

📅 <b>Joined:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

🎉 Welcome to Arena Tournament!
    `.trim();

    await sendTelegramMessage(settings.telegramBotToken, settings.telegramUserChannel, msg);
}

// Tournament join alert
async function alertTournamentJoin(settings, userData, tournamentData, ffData) {
    const msg = `
🎮 <b>TOURNAMENT JOINED!</b>

━━━━━━━━━━━━━━━━━━━━

👤 <b>Player Details:</b>
   Name: ${userData.name}
   Phone: ${userData.phone || 'N/A'}
   FF Name: ${ffData.ffName}
   FF UID: ${ffData.ffUid}

━━━━━━━━━━━━━━━━━━━━

🏆 <b>Tournament Details:</b>
   Title: ${tournamentData.title}
   Map: ${tournamentData.map}
   Entry: ₹${tournamentData.entry}
   Prize: ₹${tournamentData.prize}
   Per Kill: ₹${tournamentData.kill}

━━━━━━━━━━━━━━━━━━━━

💰 <b>Balance:</b> ₹${userData.balance}
📅 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    `.trim();

    await sendTelegramMessage(settings.telegramBotToken, settings.telegramTournamentChannel, msg);
}

module.exports = {
    sendTelegramMessage,
    alertDeposit,
    alertWithdraw,
    alertNewUser,
    alertTournamentJoin
};
