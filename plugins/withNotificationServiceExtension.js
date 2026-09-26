const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Cible iOS « Notification Service Extension » : telecharge l'image d'une
 * notification push (`imageUrl`, `mutable-content: 1`) et l'attache avant
 * l'affichage. Sans elle, iOS n'affiche que le texte.
 *
 * ⚠️ Pourquoi un plugin : `ios/` est versionne mais `expo prebuild` le VIDE et
 * le regenere (SDK 57). Une cible ajoutee a la main dans Xcode disparaitrait au
 * prochain prebuild, sans bruit.
 *
 * 1. Copie `plugins/notification-service/*` dans `ios/NotificationService/`
 *    (sources : modifier les fichiers de `plugins/`, jamais la copie).
 * 2. Ajoute la cible `app_extension`, embarquee dans l'app (phase de copie
 *    placee juste apres les ressources, avant les scripts : evite le « Cycle
 *    inside yaammoo » de Xcode 15+).
 * 3. Aligne ses reglages sur l'app : iOS minimum, iPhone seul, versions
 *    (`agvtool` met a jour toutes les cibles en CI Xcode Cloud).
 *
 * Signature EAS : cible declaree dans app.json
 * (`extra.eas.build.experimental.ios.appExtensions`).
 */
const TARGET = "NotificationService";
const SOURCE_DIR = path.join("plugins", "notification-service");
const SWIFT_FILE = "NotificationService.swift";
const PLIST_FILE = "NotificationService-Info.plist";

// Reglages recopies de l'app, configuration par configuration.
const INHERITED_SETTINGS = [
  "IPHONEOS_DEPLOYMENT_TARGET",
  "MARKETING_VERSION",
  "CURRENT_PROJECT_VERSION",
  "TARGETED_DEVICE_FAMILY",
  "SWIFT_VERSION",
  "DEVELOPMENT_TEAM",
];

const withExtensionFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const dest = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dest, { recursive: true });
      for (const file of [SWIFT_FILE, PLIST_FILE]) {
        fs.copyFileSync(
          path.join(cfg.modRequest.projectRoot, SOURCE_DIR, file),
          path.join(dest, file),
        );
      }
      return cfg;
    },
  ]);

/** Reglages de build d'une cible, indexes par nom de configuration. */
function buildSettingsByConfig(project, nativeTarget) {
  const lists = project.pbxXCConfigurationList();
  const configs = project.pbxXCBuildConfigurationSection();
  const result = {};
  for (const { value } of lists[nativeTarget.buildConfigurationList]
    .buildConfigurations) {
    result[configs[value].name] = configs[value].buildSettings;
  }
  return result;
}

const withExtensionTarget = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    if (project.pbxTargetByName(TARGET)) return cfg;

    const objects = project.hash.project.objects;
    // Le paquet `xcode` n'ajoute la dependance app -> extension que si ces
    // sections existent deja.
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};

    // Fichiers, dans un groupe a la racine du projet.
    const group = project.addPbxGroup([SWIFT_FILE], TARGET, TARGET);
    project.addFile(PLIST_FILE, group.uuid);
    project.addToPbxGroup(
      group.uuid,
      project.getFirstProject().firstProject.mainGroup,
    );

    const app = project.getFirstTarget().firstTarget;
    const phasesBefore = new Set(app.buildPhases.map((p) => p.value));

    const target = project.addTarget(
      TARGET,
      "app_extension",
      TARGET,
      `${cfg.ios.bundleIdentifier}.${TARGET}`,
    );
    project.addBuildPhase([SWIFT_FILE], "PBXSourcesBuildPhase", "Sources", target.uuid);
    project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
    project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);

    // Phase d'embarquement creee par addTarget en fin de liste : on la place
    // juste apres « Resources », avant les scripts (bundle JS, Pods, Sentry).
    const embedIndex = app.buildPhases.findIndex((p) => !phasesBefore.has(p.value));
    if (embedIndex !== -1) {
      const [embed] = app.buildPhases.splice(embedIndex, 1);
      const resourcesIndex = app.buildPhases.findIndex((p) => p.comment === "Resources");
      app.buildPhases.splice(resourcesIndex + 1, 0, embed);
    }

    const appSettings = buildSettingsByConfig(project, app);
    const extSettings = buildSettingsByConfig(project, target.pbxNativeTarget);
    for (const [name, settings] of Object.entries(extSettings)) {
      const inherited = appSettings[name] || appSettings.Release || {};
      for (const key of INHERITED_SETTINGS) {
        if (inherited[key] !== undefined) settings[key] = inherited[key];
      }
      Object.assign(settings, {
        APPLICATION_EXTENSION_API_ONLY: "YES",
        CLANG_ENABLE_MODULES: "YES",
        CODE_SIGN_STYLE: "Automatic",
        VERSIONING_SYSTEM: '"apple-generic"',
      });
      if (!settings.SWIFT_VERSION) settings.SWIFT_VERSION = "5.0";
    }
    return cfg;
  });

module.exports = function withNotificationServiceExtension(config) {
  return withExtensionTarget(withExtensionFiles(config));
};
