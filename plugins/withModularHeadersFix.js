const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Force `:modular_headers => true` sur les pods Google qui en ont besoin
 * (GoogleUtilities, RecaptchaInterop) pour que le pod Swift `AppCheckCore`
 * puisse être intégré en static library.
 *
 * Corrige : "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 * `RecaptchaInterop`, which do not define modules."
 */
const POD_LINES = [
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
];

module.exports = function withModularHeadersFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf-8");

      // Évite la double insertion si le plugin tourne plusieurs fois.
      if (contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        return cfg;
      }

      // Injecte les pods juste après la ligne d'ouverture `target '...' do`.
      const targetRegex = /(target\s+['"][^'"]+['"]\s+do\n)/;
      if (targetRegex.test(contents)) {
        contents = contents.replace(
          targetRegex,
          `$1${POD_LINES.join("\n")}\n`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);
};
