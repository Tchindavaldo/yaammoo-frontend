import { Linking, Platform } from "react-native";
import { Config } from "@/src/api/config";

/**
 * Ouvre la fiche de l'app sur le store natif (Play Store / App Store).
 *
 * Android : lien `market://` d'abord (ouvre l'app Play Store directement,
 * sans passer par un navigateur) ; repli sur l'URL web si Play Store n'est
 * pas installé (émulateur, certains devices).
 * iOS : lien https://apps.apple.com — `itms-apps://` n'apporte rien de plus
 * ici et le lien web fonctionne systématiquement.
 */
export async function openStorePage(): Promise<void> {
  if (Platform.OS === "android") {
    const marketUrl = `market://details?id=${Config.androidPackageName}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${Config.androidPackageName}`;
    const canOpenMarket = await Linking.canOpenURL(marketUrl).catch(
      () => false
    );
    await Linking.openURL(canOpenMarket ? marketUrl : webUrl);
    return;
  }

  await Linking.openURL(
    `https://apps.apple.com/app/id${Config.iosAppStoreId}`
  );
}
