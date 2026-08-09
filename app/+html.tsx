import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML pour le rendu web (Expo Router).
 * Le <title> doit contenir un noeud texte non vide : badgin (dependance de
 * expo-notifications) ecrit dans document.title via childNodes[0] lors d'un
 * popstate, ce qui crashe si le titre est vide.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>yaammoo</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
