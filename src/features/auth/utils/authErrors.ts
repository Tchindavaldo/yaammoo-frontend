export const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return "L'e-mail doit avoir une syntaxe valide.";
        case 'email-not-verified':
            return 'Email non vérifié. Cliquez sur le lien envoyé à votre compte pour vérifier et valider votre email';
        case 'auth/email-already-in-use':
            return "L'adresse e-mail est déjà utilisée par un autre compte.";
        case 'auth/weak-password':
            return 'Le mot de passe est trop faible.';
        case 'auth/wrong-password':
            return 'Le mot de passe est incorrect.';
        case 'auth/missing-password':
            return 'Le mot de passe ne doit pas être vide.';
        case 'auth/user-not-found':
            return 'Aucun utilisateur ne correspond à ces identifiants.';
        case 'auth/too-many-requests':
            return 'Trop de requêtes ont été envoyées, veuillez réessayer plus tard.';
        case 'auth/operation-not-allowed':
            return "Cette opération n'est pas autorisée pour ce type de compte.";
        case 'auth/user-disabled':
            return "L'utilisateur a été désactivé.";
        case 'auth/account-exists-with-different-credential':
            return 'Le compte existe déjà avec un identifiant différent.';
        case 'auth/requires-recent-login':
            return "L'opération nécessite une connexion récente de l'utilisateur.";
        case 'auth/invalid-verification-code':
            return 'Le code de vérification est incorrect.';
        case 'auth/invalid-phone-number':
            return 'Numéro de téléphone incorrect.';
        case 'auth/code-expired':
            return 'Le code de vérification a expiré. Renvoyez à nouveau le code.';
        case 'auth/invalid-verification-id':
            return "L'ID de vérification est incorrect.";
        case 'auth/network-request-failed':
        case 'auth/internal-error':
            return 'Connexion internet indisponible.';
        default:
            return 'Une erreur est survenue.';
    }
};
