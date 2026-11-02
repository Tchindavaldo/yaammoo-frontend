import { t } from "@/src/i18n";
export const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return t("L'e-mail doit avoir une syntaxe valide.");
        case 'email-not-verified':
            return t("Email non vérifié. Cliquez sur le lien envoyé à votre compte pour vérifier et valider votre email");
        case 'auth/email-already-in-use':
            return t("L'adresse e-mail est déjà utilisée par un autre compte.");
        case 'auth/weak-password':
            return t("Le mot de passe est trop faible.");
        case 'auth/wrong-password':
            return t("Le mot de passe est incorrect.");
        case 'auth/missing-password':
            return t("Le mot de passe ne doit pas être vide.");
        case 'auth/user-not-found':
            return t("Aucun utilisateur ne correspond à ces identifiants.");
        case 'auth/too-many-requests':
            return t("Trop de requêtes ont été envoyées, veuillez réessayer plus tard.");
        case 'auth/operation-not-allowed':
            return t("Cette opération n'est pas autorisée pour ce type de compte.");
        case 'auth/user-disabled':
            return t("L'utilisateur a été désactivé.");
        case 'auth/account-exists-with-different-credential':
            return t("Le compte existe déjà avec un identifiant différent.");
        case 'auth/requires-recent-login':
            return t("L'opération nécessite une connexion récente de l'utilisateur.");
        case 'auth/invalid-verification-code':
            return t("Le code de vérification est incorrect.");
        case 'auth/invalid-phone-number':
            return t("Numéro de téléphone incorrect.");
        case 'auth/code-expired':
            return t("Le code de vérification a expiré. Renvoyez à nouveau le code.");
        case 'auth/invalid-verification-id':
            return t("L'ID de vérification est incorrect.");
        case 'auth/network-request-failed':
        case 'auth/internal-error':
            return t("Connexion internet indisponible.");
        default:
            return t("Une erreur est survenue.");
    }
};
