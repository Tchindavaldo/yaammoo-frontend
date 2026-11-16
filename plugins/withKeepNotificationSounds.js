// Garde les sons de notification dans le build release Android.
// `enableShrinkResourcesInReleaseBuilds` supprime les res/raw que le code ne
// reference pas : les .wav copies par expo-notifications ne sont lus que par
// leur NOM (canal Android, champ `sound` FCM), donc ils sautaient tous et la
// notification sonnait avec le son par defaut. Ce fichier les declare a garder.
// Doc : architecture/notifications.md (« Sons personnalisés »).
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOUNDS = ['yaammoo_order', 'yaammoo_success', 'yaammoo_alert', 'yaammoo_message'];

module.exports = config =>
  withDangerousMod(config, [
    'android',
    async cfg => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(dir, { recursive: true });
      const keep = SOUNDS.map(s => `@raw/${s}`).join(',');
      fs.writeFileSync(
        path.join(dir, 'keep_notification_sounds.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="${keep}" />\n`,
      );
      return cfg;
    },
  ]);
