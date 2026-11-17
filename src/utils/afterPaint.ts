/**
 * Lance `fn` une fois a l'ecran ce que React vient de rendre (deux images plus
 * tard). Renvoie l'annulation.
 *
 * Pourquoi : un appel natif fait dans un effet (`updateRows`, `resetReveal`)
 * part AVANT que la nouvelle arborescence React soit posee a l'ecran. Le natif
 * l'applique donc une image plus tot : une liste passee en squelettes se voyait
 * le temps d'une image, AVANT le loader rendu dans le meme commit (flash, vu
 * image par image : en-tete encore sur l'ancien onglet, squelettes, puis loader).
 */
export function afterPaint(fn: () => void): () => void {
  let id = requestAnimationFrame(() => {
    id = requestAnimationFrame(fn);
  });
  return () => cancelAnimationFrame(id);
}
