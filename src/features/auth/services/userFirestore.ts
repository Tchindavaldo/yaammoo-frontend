import axios from "axios";
import { Config } from "@/src/api/config";
import { Users } from "@/src/types";

export const userFirestore = {
  /**
   * Récupère un utilisateur par son UID depuis le backend
   */
  async getUser(firebaseUser: any): Promise<Users | null> {
    try {
      console.log("🔍 [getUser] Fetching user with UID:", firebaseUser.uid);
      const idToken = await firebaseUser.getIdToken();
      const response = await axios.get(`${Config.apiUrl}/user/${firebaseUser.uid}`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Authorization": `Bearer ${idToken}`,
        },
      });

      const rawData = response.data.data;
      if (!rawData) return null;

      console.log(
        "📦 [getUser] Raw backend response:",
        JSON.stringify(response.data, null, 2),
      );

      // Si le backend renvoie des données plates, on reconstruit la structure attendue par le frontend
      if (!rawData.infos) {
        console.log("🔨 [getUser] Reconstruction de l'objet infos à partir des données plates...");
        const mappedUser: Users = {
          uid: rawData.uid || rawData.id || firebaseUser.uid,
          id: rawData.id || rawData.uid || firebaseUser.uid,
          isMarchand: !!rawData.fastFoodId,
          fastFoodId: rawData.fastFoodId || undefined,
          statistique: rawData.statistique || 0,
          cmd: rawData.cmd || [],
          infos: {
            nom: rawData.nom || rawData.displayName || (rawData.email ? rawData.email.split('@')[0] : 'Utilisateur'),
            prenom: rawData.prenom || '',
            age: rawData.age || 0,
            numero: rawData.numero || 0,
            email: rawData.email || firebaseUser.email || '',
            password: rawData.password || '********',
          }
        };
        return mappedUser;
      }

      // rawData.infos existe mais peut avoir des champs vides — on applique les mêmes fallbacks
      const infos = rawData.infos;
      if (!infos.email) infos.email = rawData.email || firebaseUser.email || '';
      if (!infos.nom) infos.nom = rawData.displayName || (infos.email ? infos.email.split('@')[0] : 'Utilisateur');
      return rawData;
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Error fetching user via API:", error);
      }
      return null;
    }
  },

  /**
   * Crée un nouvel utilisateur dans le backend (POST)
   * À utiliser lors de l'inscription (email ou Google)
   */
  async createUser(user: Users, firebaseUser: any): Promise<void> {
    try {
      console.log("📤 [createUser] POST /user");
      console.log("📤 [createUser] URL:", `${Config.apiUrl}/user`);
      console.log("📤 [createUser] UID:", firebaseUser.uid);
      console.log("📤 [createUser] User data:", JSON.stringify(user, null, 2));

      const idToken = await firebaseUser.getIdToken();
      const response = await axios.post(
        `${Config.apiUrl}/user`,
        { ...user, uid: firebaseUser.uid },
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
        },
      );

      console.log("✅ [createUser] Réponse backend:", response.data);
    } catch (error: any) {
      console.error("❌ [createUser] Erreur API:", error.message);
      console.error("❌ [createUser] Response:", error.response?.data);
      console.error("❌ [createUser] Status:", error.response?.status);
      throw error;
    }
  },

  /**
   * Met à jour un utilisateur existant (PUT)
   * À utiliser pour modifier le profil d'un utilisateur existant
   */
  async updateUser(user: Users, firebaseUser: any): Promise<void> {
    try {
      const idToken = await firebaseUser.getIdToken();
      await axios.put(`${Config.apiUrl}/user/${firebaseUser.uid}`, user, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
      });
    } catch (error) {
      console.error("Error updating user via API:", error);
      throw error;
    }
  },

  /**
   * Sauvegarde intelligente : essaie de créer (POST), sinon met à jour (PUT)
   * À utiliser quand on n'est pas sûr si l'utilisateur existe déjà
   */
  async saveUser(user: Users, firebaseUser: any): Promise<void> {
    try {
      // Vérifie d'abord si l'utilisateur existe
      const existingUser = await this.getUser(firebaseUser);

      if (existingUser) {
        // Utilisateur existant → PUT (update)
        await this.updateUser(user, firebaseUser);
      } else {
        // Nouvel utilisateur → POST (create)
        await this.createUser(user, firebaseUser);
      }
    } catch (error) {
      console.error("Error saving user via API:", error);
      throw error;
    }
  },

  /**
   * Recherche un utilisateur par téléphone et UID
   */
  async findUserByPhoneAndUid(
    phone: number,
    uid: string,
  ): Promise<Users | null> {
    const user = await this.getUser(uid);
    if (user && user.infos.numero === phone) {
      return user;
    }
    return null;
  },
};
