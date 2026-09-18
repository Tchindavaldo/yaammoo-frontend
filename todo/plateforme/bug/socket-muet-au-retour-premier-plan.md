# Socket muet au retour au premier plan

[ ] L'app ne reçoit plus les events émis pendant son absence (téléphone éteint,
      passage en arrière-plan prolongé) — à confirmer par la télémétrie avant
      toute correction.
    - Instrumentation en place : `src/services/socketTelemetry.ts` remonte
      chaque transition à Sentry (`Socket connect` / `disconnect` + raison /
      `foreground-dead` / `foreground-alive` / `foreground-skipped` /
      `zombie-recycled`).
    - **Suspect n°1 — `foreground-skipped`** : la garde anti-rafale
      (`CATCH_UP_COOLDOWN_MS = 10 s`) ne distingue pas deux bascules rapides
      d'un vrai réveil. Revenir moins de 10 s après une sortie saute le
      rattrapage ET le re-`join_user`, alors que l'OS a pu couper le lien.
      Piste : n'appliquer le cooldown que si l'absence a été brève, en mesurant
      le temps passé en `background` plutôt que l'écart entre deux catch-ups.
    - **Suspect n°2** : un event non fiabilisé côté backend n'est jamais rejoué
      (`globalMenu*`, `ordersRankUpdated`, `bonus.activation_changed`). Le
      catch-up HTTP est alors le seul filet — et il est justement sauté par le
      cas ci-dessus.
    - Filtrer dans Sentry sur le tag `socket.event` pour trancher.
