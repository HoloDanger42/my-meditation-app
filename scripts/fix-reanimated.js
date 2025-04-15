/**
 * Fix script for react-native-reanimated on Windows
 * This script helps bypass path length limitations by using a shorter build path
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const projectRoot = path.resolve(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const reanimatedDir = path.join(projectRoot, 'node_modules', 'react-native-reanimated');
const jniLibsDir = path.join(androidDir, 'app', 'src', 'main', 'jniLibs');

// Create directories if they don't exist
if (!fs.existsSync(jniLibsDir)) {
  fs.mkdirSync(jniLibsDir, { recursive: true });
  console.log(`Created directory: ${jniLibsDir}`);
}

// Add exclude entry to android/.gitignore if it doesn't exist
try {
  const gitignorePath = path.join(androidDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('app/src/main/jniLibs')) {
      gitignore += '\n# Pre-built native libraries\napp/src/main/jniLibs/\n';
      fs.writeFileSync(gitignorePath, gitignore);
      console.log('Updated .gitignore to exclude jniLibs');
    }
  }
} catch (error) {
  console.warn('Failed to update .gitignore:', error.message);
}

// Modify android/app/build.gradle to include the prebuilt libraries
try {
  const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Only add the sourceSets configuration if it doesn't already exist
  if (!buildGradle.includes('jniLibs.srcDirs')) {
    const androidBlock = buildGradle.match(/android\s*\{[^}]*\}/s)[0];
    const modifiedAndroidBlock = androidBlock.replace(
      /android\s*\{/,
      'android {\n    sourceSets {\n        main {\n            jniLibs.srcDirs = ["src/main/jniLibs"]\n        }\n    }'
    );
    
    buildGradle = buildGradle.replace(androidBlock, modifiedAndroidBlock);
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('Updated build.gradle to include prebuilt libraries');
  }
  
  console.log('React Native Reanimated workaround setup complete!');
  console.log('Next steps:');
  console.log('1. Run "cd android && ./gradlew clean"');
  console.log('2. Restart your build process');
  
} catch (error) {
  console.error('Failed to update build.gradle:', error.message);
}