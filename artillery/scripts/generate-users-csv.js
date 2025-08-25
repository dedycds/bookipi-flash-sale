const axios = require('axios');
const path = require('path');
const fs = require('fs');
const NUM_USERS = 3000;
const DOMAIN = 'mailinator.com';
const CSV_PATH = path.join(__dirname, '../users.csv');
const TOKENS_PATH = path.join(__dirname, '../users-tokens.json');
const API_URL = 'http://localhost:8000/users';
const random = require('random-string-generator');

const lines = ['email,password,token'];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    for (let i = 1; i <= NUM_USERS; i++) {
        const email = `user${random('alphanumeric')}@${DOMAIN}`;
        const password = `pass123456`;

        try {
            const res = await axios.post(
                API_URL,
                { email, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            lines.push(`${email},${password},${res.data.token}`);
            console.log(`Created user ${i}: ${email}`);
        } catch (err) {
            console.error(`Failed to create user ${email}:`, err.response?.data || err.message);
        }
        await delay(5);
    }
    fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf8');
    console.log(`Generated ${NUM_USERS} users in ${CSV_PATH}`);
    console.log(`Stored tokens in ${TOKENS_PATH}`);
}

main();
