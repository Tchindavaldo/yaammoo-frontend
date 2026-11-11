# Conformité loi camerounaise sur la protection des données personnelles (fin 2024)

## Consentement (obligatoire)
- [ ] Interface d'acceptation : case à cocher « J'accepte les conditions d'utilisation et la politique de confidentialité » (liens vers les deux textes).
- [ ] Emplacement : soit à l'écran de login/inscription (bouton désactivé tant que non cochée), soit via un modal dédié au home affiché tant que l'utilisateur n'a pas accepté (comptes existants inclus).
- [ ] Stocker le consentement côté backend (date, version des CGU acceptée) ; redemander si la version change.

## Non-revente
- [ ] Aucune revente / cession des données brutes à des tiers ; le mentionner dans la politique de confidentialité (`politique-confidentialite.html`, `privacy.html`).
- [ ] Vérifier que l'analytics (presence, sessions, scroll, parcours) reste interne ou anonymisé.

## Droit à la suppression
- [ ] Bouton « Supprimer mon compte et mes données » dans le profil, avec confirmation.
- [ ] Endpoint backend de suppression (compte, commandes rattachées anonymisées si nécessaires à la compta, tokens push, analytics).
- [ ] Documenter la procédure (délai de traitement, contact) dans la politique de confidentialité.
