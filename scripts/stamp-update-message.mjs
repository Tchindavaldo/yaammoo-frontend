/**
 * Inscrit le message de la publication OTA dans `expo.extra.otaMessage` d'app.json.
 *
 * Pourquoi : `expo-updates` n'expose au runtime que `updateId`, `createdAt`,
 * `channel` et `runtimeVersion`. Ni le message de publication ni l'identifiant
 * de groupe (celui qu'affiche `eas update:list`) ne parviennent a l'app, ce qui
 * rend impossible de relier un evenement Sentry a la publication qui l'a
 * produit. En revanche `expo.extra` est embarque tel quel dans le manifeste et
 * relisible via `Updates.manifest.extra` — on y depose donc le message.
 *
 * Appele par le workflow GitHub AVANT `eas update`. La modification reste
 * locale au runner et n'est jamais commitee.
 *
 * Usage : node scripts/stamp-update-message.mjs "<message>"
 */
import { readFileSync, writeFileSync } from "node:fs";

const message = process.argv[2];
if (!message) {
  console.error("Message manquant : node stamp-update-message.mjs \"<message>\"");
  process.exit(1);
}

const path = new URL("../app.json", import.meta.url);
const config = JSON.parse(readFileSync(path, "utf8"));

config.expo.extra = {
  ...config.expo.extra,
  otaMessage: message,
  // Horodatage de la publication : permet de distinguer deux updates portant
  // le meme message, cas frequent quand on republie apres un echec.
  otaPublishedAt: new Date().toISOString(),
};

writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(`extra.otaMessage = ${message}`);
