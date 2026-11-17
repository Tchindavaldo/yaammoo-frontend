# Conditions d'utilisation et confidentialité

Texte de production v1 : `legal/conditions-et-confidentialite.md`, servi par le
backend depuis la base (`GET /legal/current`, migration 077).

- `features/legal/context/LegalContext.tsx` (`LegalProvider`, monté dans
  `app/(tabs)/_layout.tsx`) : statut (`GET /legal/status`), texte, `accept()`
  (`POST /legal/accept`), `hasUpdate` (version plus récente que celle ouverte
  ou acceptée ; version ouverte gardée en `AsyncStorage` `legal_seen_version`).
- `components/LegalAcceptanceModal.tsx` : écran bloquant tant que `mustAccept`
  (jamais accepté, ou version `requires_acceptance`). Texte défilant, deux cases
  et bouton fixés en bas, lecture non obligatoire.
- `components/LegalReadSheet.tsx` : lecture seule (version, date, date
  d'acceptation), ouverte par la ligne « Conditions d'utilisation et
  confidentialité » du menu compte (`AccountSheet`, pastille du header du
  Profil). Pastille orange sur la ligne si `hasUpdate`.
- `components/LegalText.tsx` : rendu du texte brut (titres en gras).

## Adhésion du Marchand après la création de boutique (Annexe 3, 17/11/2026)

La création de boutique ne demande plus rien de légal. Une fois la boutique créée,
`LegalContext` relit `GET /legal/status` (dépendance `userData.fastFoodId`) ;
tant que `merchantAdhesionPending` vaut l'id de la boutique (et `mustAccept` est
faux), `components/MerchantAdhesionSheet` (monté dans `app/(tabs)/_layout.tsx`)
s'affiche en bottom sheet OBLIGATOIRE, sans fermeture : qualité en texte libre
(suggestions Gérant / Directeur / Propriétaire qui pré-remplissent le champ),
dénomination légale facultative, case d'acceptation, lien « Lire les conditions »
(`LegalReadSheet`). « Valider » → `submitAdhesion` → `POST /legal/merchant-adhesion`
(l'adresse est déduite par le backend de la position GPS de la boutique).
