/**
 * Check if OAuth tokens exist and are valid
 */

const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.cwd(), 'google-oauth-tokens.json');

console.log('\n========================================');
console.log('OAuth Token Check');
console.log('========================================\n');

if (!fs.existsSync(TOKEN_PATH)) {
  console.log('❌ OAuth tokens NOT found!');
  console.log('📍 Location:', TOKEN_PATH);
  console.log('\n⚠️  You need to run the setup script first:');
  console.log('   node scripts/setup-oauth-tokens.js\n');
  process.exit(1);
}

try {
  const data = fs.readFileSync(TOKEN_PATH, 'utf8');
  const tokens = JSON.parse(data);

  console.log('✓ OAuth tokens found!');
  console.log('📍 Location:', TOKEN_PATH);
  console.log('\nToken details:');
  console.log('  - Access Token:', tokens.access_token ? '✓ Present' : '❌ Missing');
  console.log('  - Refresh Token:', tokens.refresh_token ? '✓ Present' : '❌ Missing');
  console.log('  - Token Type:', tokens.token_type || 'N/A');
  console.log('  - Scope:', tokens.scope ? '✓ Present' : '❌ Missing');

  if (tokens.expiry_date) {
    const expiryDate = new Date(tokens.expiry_date);
    const now = new Date();
    const expired = expiryDate < now;
    const minutesLeft = Math.floor((expiryDate - now) / 1000 / 60);

    console.log('  - Expires:', expiryDate.toLocaleString());
    
    if (expired) {
      console.log('  - Status: ⚠️  Access token expired (will auto-refresh)');
    } else {
      console.log(`  - Status: ✓ Valid (${minutesLeft} minutes left)`);
    }
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    console.log('\n❌ Tokens are incomplete!');
    console.log('⚠️  Please re-run: node scripts/setup-oauth-tokens.js\n');
    process.exit(1);
  }

  console.log('\n✅ All tokens are valid!');
  console.log('🚀 You can now run: npm run dev\n');
  
} catch (error) {
  console.log('❌ Error reading tokens:', error.message);
  console.log('⚠️  Token file might be corrupted.');
  console.log('   Please re-run: node scripts/setup-oauth-tokens.js\n');
  process.exit(1);
}
