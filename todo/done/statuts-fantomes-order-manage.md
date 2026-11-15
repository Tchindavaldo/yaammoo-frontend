# OrderManagePanel : statuts fantômes dans statusMap (IMPLÉMENTÉ)

[x] IMPLÉMENTÉ (14/11/2026) : `active`, `in_progress`, `accept`, `completed`, `done` retirés de
    `OrderManagePanel`, `ShopOrderManagePanel`, `OrderContext`, `CartStatusPanel`, `MerchantOrderCard`.
    - `processing` est GARDÉ : le marchand l'envoie lui-même (`MerchantOrderCard`, pending → processing).
    - statuts réels : `pendingToBuy`, `pending`, `processing`, `finished`, `delivering`, `delivered`,
      `cancelByFastFood`.
