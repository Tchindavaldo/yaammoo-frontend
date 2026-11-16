import { createAudioPlayer, type AudioPlayer } from "expo-audio";

/**
 * Son joué dans l'écran de discussion quand un message de l'AUTRE partie
 * arrive en temps réel (jamais pour ses propres envois). Un seul lecteur,
 * créé au premier besoin. Doc : architecture/notifications.md (« Sons »).
 */
let player: AudioPlayer | null = null;

export function playChatSound(): void {
  try {
    if (!player) player = createAudioPlayer(require("@/assets/sounds/yaammoo_chat.wav"));
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn("[chatSound] lecture impossible", e);
  }
}
