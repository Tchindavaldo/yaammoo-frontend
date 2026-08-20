// Charge app.json et n'applique la signature debug qu'aux profils non-production.
// En production, aucun signingConfig n'est defini : EAS signe avec la cle de release
// qu'il gere (obligatoire pour le Play Store).
const appJson = require('./app.json');

const DEBUG_PROFILES = ['development', 'preview'];

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const base = { ...config, ...appJson.expo };

  if (!DEBUG_PROFILES.includes(profile)) {
    return base;
  }

  return {
    ...base,
    android: {
      ...base.android,
      signingConfig: {
        storeFile: './debug.keystore',
        storePassword: 'android',
        keyAlias: 'androiddebugkey',
        keyPassword: 'android',
      },
    },
  };
};
