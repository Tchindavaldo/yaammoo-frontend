import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback } from "react";

/**
 * Notes vocales (livraison) sur `expo-audio`, qui remplace `expo-av` retire du
 * SDK 57.
 *
 * Deux hooks sans rendu, partages par les ecrans d'enregistrement et de
 * lecture. Les objets natifs (recorder, player) sont crees ET liberes par les
 * hooks d'`expo-audio` au demontage : les ecrans n'ont plus de nettoyage a
 * faire (plus de `unloadAsync` / `stopAndUnloadAsync`).
 */

/** Enregistrement d'une note vocale (qualite haute, m4a). */
export function useVoiceNoteRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 500);

  /** Demande le micro puis demarre. `false` = permission refusee. */
  const start = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  /** Arrete et renvoie l'URI du fichier enregistre. */
  const stop = useCallback(async (): Promise<string | null> => {
    await recorder.stop();
    // iOS : en mode enregistrement, la lecture sort par l'ecouteur (volume
    // faible). On repasse en lecture seule des l'enregistrement termine.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return recorder.uri;
  }, [recorder]);

  return {
    isRecording: state.isRecording,
    durationMillis: state.durationMillis,
    start,
    stop,
  };
}

/**
 * Lecture d'une note vocale locale ou distante. `uri` null = aucun lecteur
 * actif. Changer d'`uri` recree le lecteur.
 */
export function useVoiceNotePlayer(uri: string | null | undefined) {
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  const progress =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const finished =
    status.didJustFinish ||
    (status.duration > 0 && status.currentTime >= status.duration);

  const play = useCallback(async () => {
    // Fin de lecture atteinte : on repart du debut, comme avant.
    if (finished) await player.seekTo(0);
    player.play();
  }, [player, finished]);

  const pause = useCallback(() => player.pause(), [player]);

  const toggle = useCallback(async () => {
    if (status.playing) pause();
    else await play();
  }, [status.playing, play, pause]);

  return {
    playing: status.playing,
    progress,
    finished,
    play,
    pause,
    toggle,
  };
}
