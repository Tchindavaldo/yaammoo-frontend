# Durée de livraison de chaque zone dans l'overlay Période (checkout)

**Demandé le 23/11/2026, à faire plus tard.**

Le marchand saisit une durée par zone (`duree`, minutes, sheet zone de la
boutique, ligne Localisation). Le home affiche déjà la durée la PLUS COURTE de
la boutique (`shortestDeliveryMinutes`, `MerchantHeader`) : les boutiques y sont
filtrées par la ville du client.

[ ] Overlay des périodes du bottom sheet de commande (checkout home et panier) :
    afficher la durée de chaque zone sur sa ligne quand le client la parcourt.
[ ] Même chose pour la liste express (`expressZones[].duree`).
