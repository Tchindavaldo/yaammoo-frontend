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

## Adhésion du Marchand à la création de boutique (Annexe 3)

`create-boutique/MerchantAdhesionBlock` (qualité, dénomination légale facultative,
adresse, case d'acceptation, lien « Lire les conditions » → `MerchantLegalSheet`,
copie de `LegalReadSheet`, la page `app/shop/create` étant hors du `LegalProvider`).
État : `create-boutique/useMerchantAdhesion` (branché dans `useCreateBoutique`) :
`validate()` bloque « Créer ma boutique » tant que qualité, adresse et case
manquent ; `save(fastFoodId)` appelle `POST /legal/merchant-adhesion` juste après
`POST /fastFood`. Monté dans `ShopCreateBoutiquePanel` et `CreateBoutiquePanel`.
