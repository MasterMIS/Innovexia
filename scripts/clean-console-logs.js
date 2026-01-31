const fs = require('fs');
const path = require('path');

const filesToClean = [
  'lib/sheets.ts',
  'lib/drive.ts',
  'lib/oauth.ts',
  'components/Header.tsx',
  'app/delegation/page.tsx',
  'app/todo/page.tsx',
  'app/api/upload/route.ts',
  'app/api/notifications/route.ts',
  'app/api/delegations/route.ts',
  'app/api/delegations/update-status/route.ts'
];

const rootDir = process.cwd();

filesToClean.forEach(file => {
  const filePath = path.join(rootDir, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.log, console.info, console.warn statements (but keep console.error)
    // Match single line console statements
    content = content.replace(/^\s*console\.(log|info|warn)\([^;]*\);?\r?\n/gm, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Cleaned: ${file}`);
  } else {
    console.log(`✗ Not found: ${file}`);
  }
});

console.log('\n✅ Done! Removed all console.log/info/warn statements.');
