# Boutique — Formulaire marchand (Création & Édition)

Documentation du formulaire de création et d'édition de la boutique marchande, incluant les nouvelles zones de livraison périodique/express.

---

## Pages & Navigation (Pagination)

Les deux panneaux (`CreateBoutiquePanel`, `EditBoutiquePanel`) sont découpés en **2 pages** :

| Page | Contenu | Bouton bas |
|---|---|---|
| **1** | Avatar + Nom, Ouverture/Fermeture, OM/MOMO/WhatsApp, Villes, Délai, Jours | "Suivant" (fixe) |
| **2** | Créneaux horaires + zones périodiques/express + pickup | "Retour" + "Créer"/"Mettre à jour" |

---

## État global (zones de livraison)

Pour chaque heure, deux ensembles de zones distincts :

```
deliveryHours: string[]            // ["08:00", "10:00", ...]
activeHour: string | null          // Heure dont on édite les zones

// Périodique
periodicEnabled: Record<string, boolean>   // { "08:00": true, ... }
periodicZonesByHour: Record<string, { lieu: string; prix: string }[]>

// Express
expressEnabled: Record<string, boolean>
expressZonesByHour: Record<string, { lieu: string; prix: string }[]>

// Drafts d'édition
periodicDraft: { lieu: string; prix: string }
expressDraft: { lieu: string; prix: string }
periodicEditIdx: number | null
expressEditIdx: number | null
```

### Règles métier

- Au moins un des deux blocs (périodique ou express) doit être coché avec des infos fournies
- Quand on active l'express pour une heure, les zones sont **préremplies** depuis le périodique
- Les inputs ne sont modifiables que si la checkbox du bloc est cochée
- `placeDraft.express` par défaut à `true` (checkbox express pré-cochée)

---

## Champs du formulaire (page 1)

| Champ | State | Backend field | Type |
|---|---|---|---|
| Nom Boutique | `name` | `name` | `string` |
| Ouverture | `openTime` | `openTime` | `HH:MM` |
| Fermeture | `closeTime` | `closeTime` | `HH:MM` |
| OM | `number` | `number` | `string` |
| MOMO | `momoNumber` | `momoNumber` | `string` |
| WhatsApp | `whatsappNumber` | `whatsappNumber` | `string` |
| Villes | `selectedCities` | `cities` | `string[]` |
| Délai livraison | `orderLeadTime` | `orderLeadTime` | `number` |
| Jours avance | `advanceDays` | `advanceDays` | `number` |
| Image | `image` | `image` | `string (URL)` |
| Pickup only | `pickupOnly` | `pickupOnly` | `boolean` |

---

## Payload backend (deliveryHours)

`deliveryHours` passe d'un tableau de strings à un tableau d'objets :

```json
[
  {
    "hour": "08:00",
    "periodic": true,
    "periodicZones": [{ "lieu": "Bonanjo", "prix": "500" }],
    "express": false,
    "expressZones": []
  }
]
```

---

## Composants impactés

| Fichier | Rôle |
|---|---|
| `src/features/merchant/components/EditBoutiquePanel.tsx` | Édition boutique (modale) |
| `src/features/merchant/components/CreateBoutiquePanel.tsx` | Création boutique (pleine page) |
| `src/features/merchant/components/NoBoutiquePanel.tsx` | Écran d'accueil "pas de boutique" (inchangé) |

### Liste des villes du Cameroun

Constante `CAMEROON_CITIES` (30 villes) utilisée dans les deux panneaux pour le sélecteur multi-sélection avec filtrage.

---

## Flux utilisateur

1. Remplir page 1 (infos générales) → clic "Suivant"
2. Page 2 : ajouter des heures via le time picker
3. Pour chaque heure : cocher périodique et/ou express
4. Saisir les lieux/prix dans chaque bloc activé
5. Option : cocher "Le client peut passer à la boutique"
6. Clic "Créer ma boutique" / "Mettre à jour"
