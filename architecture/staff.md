# Personnel boutique (Settings → Boutique → Personnel)

Écran plein écran du marchand pour gérer son équipe : **quotas**, **rôles** (et
leurs permissions), **membres** (création, fiche, suspension, retrait) et
**livreurs** (demandes + équipe). Remplace l'ancien écran « Livreurs »
(`DriverManageModal`, supprimé) : les livreurs font désormais partie du personnel.

Maquette : canevas Design « Gestion du personnel » — base « Bento » (variante 1)
avec l'anneau de postes et les cartes de rôle de la variante 2 (annotations du
propriétaire), parcours entrée / livreurs / création / rôle / fiche.

## Fichiers

```
src/features/staff/
├── types/staff.types.ts          # StaffRole, StaffMember, StaffPlan, drafts, StaffResult, StaffTab
├── services/staffService.ts      # HTTP /staff + STAFF_FREE_PLAN + staffErrorMessage
├── utils/
│   ├── staffPermissions.ts       # Catalogue (clé → libellé, libellé court, icône, groupe), buildCatalog, isFullAccess
│   └── staffFormat.ts            # toE164 / formatPhone (+237), noms, initiales, timeAgo, plural
├── hooks/
│   ├── useStaff.ts               # Membres + rôles + catalogue, chargés à l'ouverture ; create/update/remove
│   ├── useStaffDrivers.ts        # Demandes (pending, dédup par candidat) + livreurs, temps réel (bus DriverContext)
│   ├── useStaffDriverProfiles.ts # Note + livrées + en course par livreur (GET /driver/:id, scope marchand)
│   └── useStaffPendingCount.ts   # Nombre de demandes en attente pour la tuile Settings
└── components/
    ├── StaffManageModal.tsx      # Écran : TabHeader, quotas, onglets, FAB, feuilles, confirmation, toast
    ├── StaffHeader.tsx           # En-tête blanc plein (titre, sous-titre, Retour), copie de TabHeader sans flou
    ├── StaffSummaryCard.tsx      # Carte d'en-tête : gérant (nom du propriétaire) + anneau rôles / membres / livreurs
    ├── StaffSlotsCard.tsx        # Anneau segmenté des postes (react-native-svg) + barre des livreurs
    ├── StaffTabs.tsx             # Contrôle segmenté Équipe / Livreurs (pastille = demandes en attente)
    ├── StaffTeamTab.tsx          # « Rôles de la boutique » + cartes de rôle + carte Livreurs + état vide
    ├── StaffRoleCard.tsx         # Carte d'un rôle « Par rôle » (sombre si accès complet), avatars empilés
    │                             #   + résumé même pour 1 membre ; pastille « Voir » → feuille des membres
    ├── StaffRoleMembersSheet.tsx # Feuille d'un rôle : titre, « Modifier », membres en bloc Bento, suppression si vide
    ├── StaffMemberRow.tsx        # Ligne membre (invitation / accès coupé / chevron)
    ├── StaffDriversCard.tsx      # Carte grise « Livreurs » de l'onglet Équipe → ouvre l'onglet Livreurs
    ├── StaffDriversTab.tsx       # Demandes reçues (Refuser / Accepter) + Mes livreurs (retirer)
    ├── StaffSheet.tsx            # Feuille du bas générique (fiche membre)
    ├── StaffPage.tsx             # Page entière des formulaires membre / rôle, dans un <Modal> plein écran
    │                             #   (couvre header et tab bar ; la page rôle s'empile sur la page membre)
    ├── StaffMemberCreateSheet.tsx# « Nouveau membre » : téléphone, prénom/nom, rôle + aperçu, email facultatif
    ├── StaffRoleSheet.tsx        # Rôle (création / modification) : nom, « Partir de », interrupteurs groupés
    ├── StaffMemberSheet.tsx      # Fiche : appeler, changer de rôle, suspendre, permissions héritées, retrait
    ├── StaffConfirmDialog.tsx    # Confirmation destructive (<Modal>)
    ├── StaffAvatar.tsx · StaffSwitch.tsx · StaffPrimaryButton.tsx
    └── staffTheme.ts             # Palette ST (copie de broadcastTheme, R16) + capsLabel
```

## Contrat backend (`/staff`, Bearer posé par `setupHttp`)

| Méthode | Route | Usage |
|---|---|---|
| GET | `/staff/permissions` | Catalogue `[{ key, label }]` (échec → catalogue local) |
| GET / POST | `/staff/:fastFoodId/members` | Liste / création `{ phoneNumber (E.164), roleId, prenom?, nom?, email?, password? }` |
| PATCH / DELETE | `/staff/:fastFoodId/members/:memberId` | `{ roleId? , active? }` (active false = suspension) / retrait |
| GET / POST | `/staff/:fastFoodId/roles` | Liste / création `{ name, permissions[] }` |
| PATCH / DELETE | `/staff/:fastFoodId/roles/:roleId` | Modification / suppression (409 tant qu'attribué) |

Réponses `{ success, data }` ; en erreur, `message` du backend est affiché en toast
(`staffErrorMessage`). Membre : `userId` null = jamais connecté (« Invitation »).
Le propriétaire a implicitement toutes les permissions ; un rôle qui les a toutes
s'affiche en carte sombre « Accès complet ».

Livreurs : endpoints `/driver/*` inchangés (voir [driver.md](./driver.md)).

## Quotas

Le backend n'expose **pas encore** de quota de personnel : `STAFF_FREE_PLAN`
(`staffService.ts`) porte les valeurs affichées (8 membres, 5 livreurs, plan
« Gratuit »), en un seul endroit. Poste plein → FAB grisé ; places de livreur
pleines → « Accepter » refusé par toast. À brancher sur le backend dès qu'il sert
un plan.

## Parcours

- **Page entière** : l'écran s'ouvre dans un `<Modal>` plein écran (couvre header
  et tab bar, aucun changement de navbar) ; FAB et feuilles sur la safe-area.
- **En-tête** : `StaffSummaryCard` (gérant + anneau rôles / membres / livreurs).

- **Entrée** : tuile « Personnel » (`people-outline`) ; teinte accent + mention
  « n demandes » quand des candidatures attendent (`useStaffPendingCount`, rechargé
  à la fermeture de l'écran et à chaque event socket de demande).
- **Deep-link** : `?section=drivers` ouvre Personnel sur l'onglet Livreurs,
  `?section=staff` sur Équipe (`useSettingsSubScreens` → `staffTab`).
- **Équipe** : cartes `StaffRoleCard` triées (accès complet, puis les plus peuplés) ;
  appui = feuille `StaffRoleMembersSheet` (membres → fiche, « Modifier », « Supprimer le
  rôle » si vide). Les
  membres dont le rôle n'existe plus sont regroupés dans « Sans rôle ».
- **Nouveau membre** : « Nouveau rôle » ou « Modifier » ouvrent la feuille rôle
  par-dessus ; un rôle créé depuis là est présélectionné.
- **Fiche** : « Suspendre » et l'interrupteur « Accès actif » font le même PATCH
  `active` ; « Retirer de la boutique » passe par une confirmation.
