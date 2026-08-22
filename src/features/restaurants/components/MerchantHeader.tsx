import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Theme } from '@/src/theme';
import { CardSkeleton } from '@/src/components/CardSkeleton';
import { useShopReveal } from '../context/ShopRevealContext';

interface MerchantHeaderProps {
  name: string;
  image?: string;
  rating?: number;
  /**
   * URL de la PREMIERE image de menu de la boutique. Le squelette du header
   * reste affiche jusqu'a ce qu'elle soit prete.
   *
   * ⚠️ C'est ce qui synchronise le header avec ses cartes : sans lui, le nom et
   * les etoiles s'affichaient instantanement (ce sont du texte) alors que les
   * plats etaient encore en squelette — la rangee se remplissait en deux temps.
   * Les cartes montent la meme URL au meme instant, et expo-image dedoublonne
   * la requete : les deux se resolvent donc ensemble.
   */
  syncWithImage?: string | null;
}

export const MerchantHeader: React.FC<MerchantHeaderProps> = ({
  name,
  image,
  rating = 4.5,
  syncWithImage,
}) => {
  // Le header attend DEUX images : celle du menu (pour rester synchrone avec
  // les cartes) et son PROPRE avatar.
  //
  // ⚠️ L'avatar etait oublie : le header sortait de son squelette des que le
  // menu etait pret, puis l'avatar arrivait plus tard — on voyait le nom et les
  // etoiles a cote d'un rond vide. Les deux doivent etre prets ensemble.
  const [menuReady, setMenuReady] = React.useState(!syncWithImage);
  const [avatarReady, setAvatarReady] = React.useState(!image);

  // ⚠️ Sous un `ShopRevealProvider`, c'est la BOUTIQUE qui decide : le header et
  // ses cartes basculent au meme instant. L'avatar est inscrit au groupe pour
  // que les cartes ne se revelent pas avant lui — c'est exactement ce qui se
  // passait (les plats etaient la, le rond de l'avatar encore vide).
  const shop = useShopReveal();
  // Inscription pendant le rendu : les effets tournent apres la fermeture de la
  // fenetre d'inscription du provider.
  if (shop && image) shop.register(image);

  const markAvatar = React.useCallback(() => {
    setAvatarReady(true);
    if (image) shop?.resolve(image);
  }, [image, shop]);

  const rawReady = shop ? shop.ready : menuReady && avatarReady;

  // ⚠️ L'avatar reel (ci-dessous, branche `ready`) monte sa PROPRE `<Image>`,
  // distincte du temoin. Meme decalage d'une frame que les cartes de
  // `DesignItem` — necessaire pour que le header bascule au meme instant que la
  // rangee, pas juste au meme instant logique (`setState`).
  const [ready, setReady] = React.useState(rawReady);
  React.useEffect(() => {
    if (!rawReady) {
      setReady(false);
      return;
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [rawReady]);

  // ⚠️ On MONTE des images temoins plutot que d'appeler `Image.prefetch`. Le
  // prefetch se resout nettement plus tard que le `onLoad` d'une image montee
  // (il fait sa propre requete, puis il faut encore un rendu) : le header
  // restait en squelette alors que les plats etaient deja affiches. Ici c'est
  // exactement le meme mecanisme que les cartes, sur les memes URLs —
  // expo-image dedoublonne, tout se resout donc ensemble.
  const witnesses = (
    <>
      {/* Sous une boutique, les cartes montent deja cette URL et s'inscrivent
          au groupe : un temoin ici ferait doublon. */}
      {syncWithImage && !shop ? (
        <Image
          source={{ uri: syncWithImage }}
          style={styles.witness}
          cachePolicy="memory-disk"
          onLoad={() => setMenuReady(true)}
          // Un echec ne doit pas figer le header sur son squelette.
          onError={() => setMenuReady(true)}
        />
      ) : null}
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.witness}
          cachePolicy="memory-disk"
          onLoad={markAvatar}
          onError={markAvatar}
        />
      ) : null}
    </>
  );

  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.min(Math.max(rating - i, 0), 1);
    return fill;
  });

  if (!ready) {
    return (
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.avatarContainer}>
            <CardSkeleton radius={16} />
          </View>
          <View style={styles.nameSkeleton}>
            <CardSkeleton radius={6} />
          </View>
        </View>
        {/* Un bloc unique a la place des 5 etoiles : le squelette suggere la
            zone, il n'a pas a en mimer le detail. */}
        <View style={styles.ratingSkeleton}>
          <CardSkeleton radius={6} />
        </View>
        {witnesses}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.avatarContainer}>
          <Image
            source={image ? { uri: image } : require('@/assets/blur3.jpg')}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
      </View>
      <View style={styles.ratingContainer}>
        {stars.map((fill, i) => (
          <View key={i} style={styles.starWrapper}>
            <Ionicons name="star" size={14} color={Theme.colors.gray[200]} />
            <View style={[styles.starFill, { width: `${fill * 100}%` }]}>
              <Ionicons name="star" size={14} color="#e8440a" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.white,
    marginBottom: Theme.spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    maxWidth: 120,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    // paddingHorizontal: 8,
    // paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  starWrapper: {
    position: 'relative',
  },
  starFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  // Dimensions calees sur le contenu reel, pour que la ligne ne saute pas au
  // moment ou le squelette cede la place.
  nameSkeleton: {
    width: 110,
    height: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
  ratingSkeleton: {
    width: 82,
    height: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Image temoin : montee pour declencher un vrai chargement, invisible et
  // hors flux pour ne rien occuper. Taille 1x1 plutot que 0 — une vue de
  // dimension nulle peut ne jamais declencher `onLoad`.
  witness: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
