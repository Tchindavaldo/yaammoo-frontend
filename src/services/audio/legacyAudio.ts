import {
  AudioModule,
  AudioPlayer,
  AudioRecorder,
  AudioStatus,
  createAudioPlayer,
  RecordingOptions,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync as setExpoAudioModeAsync,
} from "expo-audio";
import { Platform } from "react-native";

/**
 * Adaptateur `expo-av` -> `expo-audio` (migration Expo SDK 57).
 *
 * `expo-av` a ete retire du SDK : il ne recoit plus de correctif et ne se
 * compile plus avec React Native 0.86. Les ecrans de notes vocales utilisaient
 * sa petite surface d'API (enregistrer, relire, avancer). Plutot que de
 * reecrire six ecrans (dont plusieurs depassent deja 500 lignes), on reproduit
 * EXACTEMENT cette surface au-dessus d'`expo-audio` : les ecrans ne changent
 * que leur import.
 *
 * ⚠️ Seules les methodes reellement utilisees sont couvertes. Un nouvel ecran
 * doit utiliser `expo-audio` directement (`useAudioRecorder`,
 * `useAudioPlayer`), pas etendre cet adaptateur.
 *
 * Unites : `expo-av` parlait en millisecondes, `expo-audio` en secondes. La
 * conversion est faite ICI, les ecrans gardent leurs `positionMillis`.
 */

/**
 * Methodes heritees de `SharedObject` (expo-modules-core). Presentes a
 * l'execution, mais leurs types ne resolvent pas : npm range
 * `expo-modules-core` sous `node_modules/expo/`, hors de portee de TypeScript
 * depuis `expo-audio` (Metro, lui, le trouve — le bundle passe).
 */
interface SharedObjectLike {
  release(): void;
  addListener(
    event: string,
    listener: (payload: AudioStatus) => void,
  ): { remove: () => void };
}

/** Statut de lecture au format `expo-av` (champs lus par les ecrans). */
export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
  positionMillis: number;
  durationMillis?: number;
}

const toPlaybackStatus = (s: AudioStatus): PlaybackStatus => ({
  isLoaded: s.isLoaded,
  isPlaying: s.playing,
  didJustFinish: s.didJustFinish,
  positionMillis: Math.round((s.currentTime || 0) * 1000),
  durationMillis: s.duration ? Math.round(s.duration * 1000) : undefined,
});

/** `Audio.requestPermissionsAsync()` : permission micro. */
export async function requestPermissionsAsync() {
  return requestRecordingPermissionsAsync();
}

/** `Audio.setAudioModeAsync()` : noms `expo-av` traduits vers `expo-audio`. */
export async function setAudioModeAsync(mode: {
  allowsRecordingIOS?: boolean;
  playsInSilentModeIOS?: boolean;
}) {
  await setExpoAudioModeAsync({
    ...(mode.allowsRecordingIOS !== undefined && {
      allowsRecording: mode.allowsRecordingIOS,
    }),
    ...(mode.playsInSilentModeIOS !== undefined && {
      playsInSilentMode: mode.playsInSilentModeIOS,
    }),
  });
}

/** `Audio.RecordingOptionsPresets` : memes presets, cote `expo-audio`. */
export const RecordingOptionsPresets = RecordingPresets;

/**
 * Options « a plat » attendues par le constructeur natif. Reprend
 * `createRecordingOptions` d'`expo-audio`, non exporte publiquement.
 */
function platformOptions(options: RecordingOptions) {
  const common = {
    extension: options.extension,
    sampleRate: options.sampleRate,
    numberOfChannels: options.numberOfChannels,
    bitRate: options.bitRate,
    isMeteringEnabled: options.isMeteringEnabled ?? false,
  };
  if (Platform.OS === "ios") return { ...common, ...options.ios };
  if (Platform.OS === "android") return { ...common, ...options.android };
  return { ...common, ...options.web };
}

/** Constructeur du recorder : le web a sa propre classe. */
const RecorderClass: new (options: object) => AudioRecorder =
  Platform.OS === "web"
    ? (AudioModule as any).AudioRecorderWeb
    : (AudioModule as any).AudioRecorder;

/** `Audio.Recording` : enregistrement d'une note vocale. */
export class Recording {
  private uri: string | null = null;

  private constructor(private recorder: AudioRecorder | null) {}

  /** Cree, prepare et DEMARRE l'enregistrement (comme `expo-av`). */
  static async createAsync(
    options: RecordingOptions,
  ): Promise<{ recording: Recording }> {
    const recorder = new RecorderClass(platformOptions(options));
    await recorder.prepareToRecordAsync();
    recorder.record();
    return { recording: new Recording(recorder) };
  }

  /** Arrete et libere le recorder. L'URI reste lisible ensuite. */
  async stopAndUnloadAsync() {
    const recorder = this.recorder;
    if (!recorder) return;
    this.recorder = null;
    await recorder.stop();
    this.uri = recorder.uri;
    (recorder as unknown as SharedObjectLike).release();
  }

  getURI(): string | null {
    return this.uri ?? this.recorder?.uri ?? null;
  }
}

/** `Audio.Sound` : lecture d'une note vocale. */
export class Sound {
  private listener: { remove: () => void } | null = null;

  private constructor(private player: AudioPlayer) {}

  static async createAsync(
    source: { uri: string },
    initialStatus?: { shouldPlay?: boolean },
    onPlaybackStatusUpdate?: (status: PlaybackStatus) => void,
  ): Promise<{ sound: Sound }> {
    const sound = new Sound(createAudioPlayer(source));
    if (onPlaybackStatusUpdate) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
    if (initialStatus?.shouldPlay) sound.player.play();
    return { sound };
  }

  setOnPlaybackStatusUpdate(cb: ((status: PlaybackStatus) => void) | null) {
    this.listener?.remove();
    this.listener = cb
      ? (this.player as unknown as SharedObjectLike).addListener(
          "playbackStatusUpdate",
          (s: AudioStatus) => cb(toPlaybackStatus(s)),
        )
      : null;
  }

  async getStatusAsync(): Promise<PlaybackStatus> {
    const p = this.player;
    return {
      isLoaded: p.isLoaded,
      isPlaying: p.playing,
      didJustFinish: false,
      positionMillis: Math.round((p.currentTime || 0) * 1000),
      durationMillis: p.duration ? Math.round(p.duration * 1000) : undefined,
    };
  }

  async playAsync() {
    this.player.play();
  }

  async pauseAsync() {
    this.player.pause();
  }

  async setPositionAsync(millis: number) {
    await this.player.seekTo(millis / 1000);
  }

  /** Libere le lecteur natif (equivalent de `unloadAsync` d'`expo-av`). */
  async unloadAsync() {
    this.listener?.remove();
    this.listener = null;
    this.player.remove();
  }
}
