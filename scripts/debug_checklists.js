const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Configuration
const SPREADSHEET_ID = '1KnbqHtNusr2C_QBiX2e_L3LHbsRJy68YEwuphRtTBVU'; // Updated ID from user
const TOKEN_PATH = path.join(__dirname, '..', 'google-oauth-tokens.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', '.env.local');

// Load env vars for client ID/Secret manually since we are running a standalone script
function loadEnv() {
    try {
        const envFile = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                envVars[key] = value;
            }
        });
        return envVars;
    } catch (error) {
        console.error('Error reading .env.local:', error);
        return {};
    }
}

async function main() {
    console.log('--- Starting Checklist Debug Script ---');

    // 1. Load Credentials
    const env = loadEnv();
    const clientId = env['GOOGLE_CLIENT_ID'];
    const clientSecret = env['GOOGLE_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
        console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
        return;
    }
    console.log('✅ Loaded Client ID and Secret');

    // 2. Load Tokens
    if (!fs.existsSync(TOKEN_PATH)) {
        console.error(`❌ Token file not found at ${TOKEN_PATH}`);
        return;
    }
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('✅ Loaded OAuth Tokens');

    // 3. Initialize Client
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth });

    // 4. Check Spreadsheet Access
    try {
        console.log(`Testing access to Spreadsheet ID: ${SPREADSHEET_ID}...`);
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });

        console.log('✅ Spreadsheet accessible!');
        console.log(`   Title: ${response.data.properties.title}`);

        // 5. List Sheets
        const sheetNames = response.data.sheets.map(s => s.properties.title);
        console.log('   Sheets found:', sheetNames.join(', '));

        // 6. Check for 'checklists' sheet
        if (sheetNames.includes('checklists')) {
            console.log('✅ "checklists" sheet exists.');

            // 7. Read Headers
            const headerResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'checklists!A1:Z1'
            });

            const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
            console.log('   Headers:', headers.join(', '));

            if (headers.length === 0) {
                console.warn('⚠️ "checklists" sheet exists but has NO HEADERS.');
            } else {
                // Check for required columns
                const required = ['id', 'question', 'assignee', 'frequency', 'due_date', 'status'];
                const missing = required.filter(h => !headers.includes(h));
                if (missing.length > 0) {
                    console.error('❌ Missing required headers:', missing.join(', '));
                } else {
                    console.log('✅ Basic headers check passed.');
                }
            }

        } else {
            console.error('❌ "checklists" sheet NOT FOUND.');
            console.log('   The application should attempt to create it automatically on next request.');
        }

    } catch (error) {
        console.error('❌ Error accessing spreadsheet:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Status Text: ${error.response.statusText}`);
            if (error.response.data && error.response.data.error) {
                console.error(`   Message: ${error.response.data.error.message}`);
            }
        } else {
            console.error(error.message);
        }
    }
}

main();
