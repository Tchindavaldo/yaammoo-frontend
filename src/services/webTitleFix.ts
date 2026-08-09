/**
 * Correctif web : badgin (dependance de expo-notifications) ecrit dans
 * document.title via `element.childNodes[0].nodeValue`. Si le <title> du
 * document est vide (cas du HTML servi par le dev server Expo), childNodes
 * est vide et l'ecriture crashe au retour de navigation (popstate).
 *
 * On garantit qu'un <title> existe et contient un noeud texte non vide.
 */
const DEFAULT_TITLE = "yaammoo";

if (typeof document !== "undefined") {
  let title = document.querySelector("title");

  if (!title) {
    title = document.createElement("title");
    document.head.appendChild(title);
  }

  if (title.childNodes.length === 0) {
    title.appendChild(document.createTextNode(DEFAULT_TITLE));
  }
}

export {};
