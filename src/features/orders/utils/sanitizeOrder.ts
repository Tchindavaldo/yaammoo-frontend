/**
 * Sanitization stricte d'une commande avant envoi au backend.
 * Format identique à celui historiquement envoyé par buyOrders → PUT /order/tabs.
 * Réutilisé pour le paiement (items de /transaction) afin d'envoyer EXACTEMENT
 * les mêmes champs qu'avant.
 */
export const sanitizeOrder = (o: any, userId?: string): any => {
  const sanitized: any = {
    id: o.id,
    userId: userId ?? o.userId,
    fastFoodId: o.fastFoodId,
    total: Number(o.total) || 0,
    quantity: Number(o.quantity) || 1,
    selectedPriceIndex: o.selectedPriceIndex || 1,
    status: o.status || "pending",
    userData: o.userData
      ? {
          firstName: o.userData.firstName || "Client",
          lastName: o.userData.lastName || "",
          email: o.userData.email || "inconnu@email.com",
          phoneNumber: Number(o.userData.phoneNumber) || 0,
          photoUrl: o.userData.photoUrl,
        }
      : undefined,
    extra: Array.isArray(o.extra)
      ? o.extra.map((e: any) => ({
          name: e.name || "Extra",
          status: !!e.status,
          ...(e.prix !== undefined && { prix: e.prix }),
        }))
      : [],
    drink: Array.isArray(o.drink)
      ? o.drink.map((d: any) => ({
          name: d.name || "Boisson",
          status: !!d.status,
          ...(d.prix !== undefined && { prix: d.prix }),
          quantite: d.quantite || 1,
        }))
      : [],
    delivery: (() => {
      const d = o.delivery;
      if (!d) return undefined;
      const hasDelivery = !!d.status && d.type !== "aucune";
      const base: any = {
        status: hasDelivery,
        date: d.date || new Date().toISOString().split("T")[0],
      };
      if (hasDelivery) {
        if (d.type) base.type = d.type;
        if (d.location) base.location = d.location;
        if (d.phone) base.phone = d.phone;
        if (d.voiceNoteUri) base.voiceNoteUri = d.voiceNoteUri;
        if (d.record) base.record = d.record;
        if (d.note) base.note = d.note;
        if (d.type === "time" && d.time) base.time = d.time;
      }
      return base;
    })(),
  };

  if (o.menu) {
    sanitized.menu = {
      id: o.menu.id,
      fastFoodId: o.menu.fastFoodId,
      name: o.menu.name || o.menu.titre,
      coverImage: o.menu.coverImage || o.menu.image,
      coverImageHasBackground: o.menu.coverImageHasBackground ?? true,
      images: Array.isArray(o.menu.images)
        ? o.menu.images
        : [o.menu.coverImage || o.menu.image],
      prices: Array.isArray(o.menu.prices)
        ? o.menu.prices.map((p: any) => ({
            price: Number(p.price) || 0,
            description: p.description || "",
          }))
        : [],
      extra: [],
      drink: [],
      status: o.menu.status || "available",
    };
  }

  if (o.createdAt) sanitized.createdAt = o.createdAt;
  if (o.updatedAt) sanitized.updatedAt = o.updatedAt;
  if (o.rank) sanitized.rank = o.rank;

  return sanitized;
};
