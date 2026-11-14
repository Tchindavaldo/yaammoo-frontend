"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";

// Titres : ligne en MAJUSCULES (parties, annexes) ou « 12. Titre » court.
const isHeading = (p: string) => (p.length < 90 && p === p.toUpperCase() && /[A-Z]/.test(p)) || /^\d+\.\s+[^\d].{0,70}$/.test(p);

/** Texte légal brut (paragraphes séparés par une ligne vide), titres en gras. */
export function LegalText({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <View style={styles.wrap}>
      {paragraphs.map((p, i) => (
        <Text key={i} style={isHeading(p) ? styles.heading : styles.body}>
          {p}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { fontSize: 15, fontWeight: "700", color: DS.ink, marginTop: 8 },
  body: { fontSize: 13, lineHeight: 19, color: DS.text2 },
});
