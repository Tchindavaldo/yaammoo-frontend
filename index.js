// Point d'entree de l'app.
//
// La tache de localisation arriere-plan doit etre definie au chargement du
// bundle : Android l'execute sans monter l'interface, donc sans jamais charger
// les ecrans d'expo-router. Voir architecture/user-location.md.
import "./src/features/location/tasks/backgroundLocationTask";
import "expo-router/entry";
