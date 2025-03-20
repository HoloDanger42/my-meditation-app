const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

console.log("🧹 Starting project reset...");

// Clean node_modules
console.log("📦 Cleaning node_modules...");
try {
  const command =
    os.platform() === "win32"
      ? "if exist node_modules rmdir /s /q node_modules"
      : "rm -rf node_modules";
  execSync(command, { stdio: "inherit" });
} catch (error) {
  console.error("Failed to remove node_modules:", error.message);
}

// Clean Android build
console.log("🤖 Cleaning Android build...");
try {
  const androidDir = path.join(__dirname, "..", "android");
  if (fs.existsSync(androidDir)) {
    process.chdir(androidDir);
    execSync(os.platform() === "win32" ? "gradlew clean" : "./gradlew clean", {
      stdio: "inherit",
    });
    process.chdir(path.join(__dirname, ".."));
  }
} catch (error) {
  console.error("Failed to clean Android build:", error.message);
}

// Fix the dependency cycle
console.log("🔄 Fixing dependency cycle...");
try {
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const packageJson = require(packageJsonPath);

  // Remove self-reference
  if (
    packageJson.dependencies &&
    packageJson.dependencies["my-meditation-app"]
  ) {
    delete packageJson.dependencies["my-meditation-app"];
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Removed self-reference from package.json");
  }
} catch (error) {
  console.error("Failed to fix package.json:", error.message);
}

// Reinstall dependencies
console.log("📥 Reinstalling dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
} catch (error) {
  console.error("Failed to reinstall dependencies:", error.message);
}

console.log("✨ Project reset complete!");
