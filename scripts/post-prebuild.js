const fs = require('fs');
const path = require('path');

// Path to your backup google-services.json (keep this somewhere outside the android folder)
const backupDir = path.join(__dirname, '../config');
const googleServicesBackup = path.join(backupDir, 'google-services.json.backup');
const googleServicesTarget = path.join(__dirname, '../android/app/google-services.json');

console.log('Running post-prebuild script to restore google-services.json');

// Create backup if it doesn't exist but the original does
if (!fs.existsSync(googleServicesBackup) && fs.existsSync(googleServicesTarget)) {
  console.log('Creating backup of google-services.json');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.copyFileSync(googleServicesTarget, googleServicesBackup);
  console.log('✅ Backup created at', googleServicesBackup);
}

// Restore from backup if it exists
if (fs.existsSync(googleServicesBackup)) {
  console.log('Restoring google-services.json after prebuild');
  // Ensure the target directory exists
  const targetDir = path.dirname(googleServicesTarget);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(googleServicesBackup, googleServicesTarget);
  console.log('✅ Successfully restored google-services.json');
} else {
  console.log('❌ No backup google-services.json found at', googleServicesBackup);
}