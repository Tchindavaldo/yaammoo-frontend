import axios from "axios";
import { Config } from "@/src/api/config";
import { Users } from "@/src/types";

export const userFirestore = {
  /**
   * Récupère un utilisateur par son UID depuis le backend
   */
  async getUser(uid: string): Promise<Users | null> {
    try {
      const response = await axios.get(`${Config.apiUrl}/user/${uid}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = response.data.data;
      return data && data.infos ? data : null;
    } catch (error) {
      console.error("Error fetching user via API:", error);
      return null;
    }
  },

  /**
   * Crée un nouvel utilisateur dans le backend (POST)
   * À utiliser lors de l'inscription (email ou Google)
   */
  async createUser(user: Users, uid: string): Promise<void> {
    try {
      await axios.post(
        `${Config.apiUrl}/user`,
        { ...user, uid },
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Error creating user via API:", error);
      throw error;
    }
  },

  /**
   * Met à jour un utilisateur existant (PUT)
   * À utiliser pour modifier le profil d'un utilisateur existant
   */
  async updateUser(user: Users, uid: string): Promise<void> {
    try {
      await axios.put(`${Config.apiUrl}/user/${uid}`, user, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
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
  async saveUser(user: Users, uid: string): Promise<void> {
    try {
      // Vérifie d'abord si l'utilisateur existe
      const existingUser = await this.getUser(uid);

      if (existingUser) {
        // Utilisateur existant → PUT (update)
        await this.updateUser(user, uid);
      } else {
        // Nouvel utilisateur → POST (create)
        await this.createUser(user, uid);
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
