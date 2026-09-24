const {
  withDangerousMod,
  withInfoPlist,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Tout ce qu'il faut a `ios/` pour que Xcode Cloud compile, reapplique a
 * chaque `expo prebuild`.
 *
 * ⚠️ Pourquoi un plugin : `ios/` est versionne (Xcode Cloud compile le projet
 * natif et ne lit pas app.json), mais depuis le SDK 57 `expo prebuild` VIDE et
 * regenere `ios/` par defaut. Ces retouches etaient faites a la main : un
 * prebuild les effacait sans bruit, et l'archive Xcode Cloud cassait ensuite.
 *
 * 1. Podfile : `libdav1d` en podspec precompile (le pod d'origine clone un
 *    sous-module git, bloque par Xcode Cloud).
 * 2. Podfile : deployment target aligne sur la plateforme pour CHAQUE pod.
 *    Xcode 27 refuse une cible sous iOS 15.0, or de nombreux pods declarent
 *    encore 8.0, 9.0 ou 12.0 (SDWebImage, PromisesObjC, GoogleSignIn,
 *    AsyncStorage, Sentry...) — l'archive echouait sur ~15 cibles a la fois.
 * 3. `ios/ci_scripts/ci_post_clone.sh` copie depuis
 *    `scripts/xcode-cloud/ci_post_clone.sh` (versioning, OTA, pod install).
 * 4. Info.plist : versions lues depuis le projet Xcode (`$(MARKETING_VERSION)`,
 *    `$(CURRENT_PROJECT_VERSION)`), que `agvtool` met a jour en CI.
 * 5. `ios/.xcode.env` : `SENTRY_ALLOW_FAILURE` — sans jeton Sentry dans
 *    l'environnement Xcode Cloud, l'upload des symboles faisait echouer
 *    l'archive.
 */
const MARKER = "# [withXcodeCloud]";

const LIBDAV1D =
  "  pod 'libdav1d', :podspec => 'https://raw.githubusercontent.com/SDWebImage/libdav1d-Xcode/master/libdav1d.podspec'";

const DEPLOYMENT_TARGET_LOOP = `
    ${MARKER} Xcode 27 refuse une cible sous iOS 15.0 : on aligne chaque pod.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        current = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new(min_ios_version_supported)
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_version_supported
        end
      end
    end
`;

const XCODE_ENV_SENTRY = `
${MARKER} Sans SENTRY_AUTH_TOKEN (Xcode Cloud), l'upload Sentry echoue : on
# le laisse echouer sans bloquer l'archive. Avec le jeton, l'upload a lieu.
export SENTRY_ALLOW_FAILURE=true
`;

function patchPodfile(contents) {
  if (contents.includes(MARKER)) return contents;

  const targetRegex = /(target\s+['"][^'"]+['"]\s+do\n)/;
  if (!targetRegex.test(contents)) {
    throw new Error("[withXcodeCloud] Podfile : `target ... do` introuvable");
  }
  contents = contents.replace(
    targetRegex,
    `$1  ${MARKER} sous-module git bloque par Xcode Cloud\n${LIBDAV1D}\n`,
  );

  const postInstallRegex = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
  if (!postInstallRegex.test(contents)) {
    throw new Error(
      "[withXcodeCloud] Podfile : `react_native_post_install(...)` introuvable",
    );
  }
  return contents.replace(postInstallRegex, `$1${DEPLOYMENT_TARGET_LOOP}`);
}

const withXcodeCloudFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projectRoot = cfg.modRequest.projectRoot;

      // 1-2. Podfile
      const podfilePath = path.join(iosRoot, "Podfile");
      fs.writeFileSync(
        podfilePath,
        patchPodfile(fs.readFileSync(podfilePath, "utf-8")),
      );

      // 3. Script Xcode Cloud
      const ciDir = path.join(iosRoot, "ci_scripts");
      fs.mkdirSync(ciDir, { recursive: true });
      const ciTarget = path.join(ciDir, "ci_post_clone.sh");
      fs.copyFileSync(
        path.join(projectRoot, "scripts/xcode-cloud/ci_post_clone.sh"),
        ciTarget,
      );
      fs.chmodSync(ciTarget, 0o755);

      // 5. .xcode.env
      const envPath = path.join(iosRoot, ".xcode.env");
      const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      if (!env.includes(MARKER)) {
        fs.writeFileSync(envPath, env + XCODE_ENV_SENTRY);
      }
      return cfg;
    },
  ]);

// 4. Versions lues depuis le projet Xcode, mises a jour par agvtool en CI.
const withXcodeCloudVersions = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleShortVersionString = "$(MARKETING_VERSION)";
    cfg.modResults.CFBundleVersion = "$(CURRENT_PROJECT_VERSION)";
    return cfg;
  });

module.exports = function withXcodeCloud(config) {
  return withXcodeCloudVersions(withXcodeCloudFiles(config));
};
