import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import ForceUpdateScreen from "./ForceUpdateScreen";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Mise à jour DISPONIBLE (le client n'est pas sous le minimum requis).
 *
 * Rend exactement la MÊME page que le blocage (`ForceUpdateScreen`), en plein
 * écran par-dessus la home : l'utilisateur voit une mise en page identique quel
 * que soit le cas, seuls le texte et le bouton « Plus tard » changent. Avant,
 * une carte flottante distincte affichait un message proche mais un visuel
 * different — deux ecrans a maintenir pour un meme propos.
 *
 * `animationType="fade"` : apparition en fondu, jamais brusque. Le délai avant
 * présentation est géré par l'appelant (`UPDATE_SHEET_DELAY_MS` dans la home),
 * pour laisser la home se poser après le splash.
 */
export default function UpdateAvailableSheet({ visible, onDismiss }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
      presentationStyle="fullScreen"
    >
      <View style={styles.fill}>
        <ForceUpdateScreen mandatory={false} onDismiss={onDismiss} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#f7f5f4" },
});
