// En-tete du sheet commande marchand : avatar + nom, chips de zones / « Cmd »
// (avec compteur « +N » de debordement) et corbeille a droite. Extrait de
// MerchantOrderBottomSheet (R26), comportement inchange.
import React, { useCallback, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Commande } from '@/src/types';
import { DS } from "@/src/theme/ds";
import { t as tr } from "@/src/i18n";
import type { DeliveryUser } from '../utils/merchantOrderSheetData';
import { styles } from './MerchantOrderBottomSheet.styles';

type Props = {
  user: DeliveryUser;
  hasMultiple: boolean;
  zones: string[];
  selectedZone: string;
  onSelectZone: (zone: string) => void;
  orderList: Commande[];
  selectedOrderIdx: number;
  onSelectOrder: (idx: number) => void;
  panHandlers: object;
  onDelete: () => void;
};

export function MerchantOrderSheetHeader({
  user, hasMultiple, zones, selectedZone, onSelectZone, orderList,
  selectedOrderIdx, onSelectOrder, panHandlers, onDelete,
}: Props) {
  // ─── Chips « Cmd » du header : compteur de débordement « +N » ───────────────
  // Largeur d'un chip + gap : sert à convertir des pixels masqués en nb de chips.
  const CMD_CHIP_W = 58;
  const [cmdViewportW, setCmdViewportW] = useState(0);
  const [cmdContentW, setCmdContentW] = useState(0);
  const [cmdScrollX, setCmdScrollX] = useState(0);

  const handleCmdLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => setCmdViewportW(e.nativeEvent.layout.width),
    [],
  );
  const handleCmdContentSize = useCallback((w: number) => setCmdContentW(w), []);
  const handleCmdScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => setCmdScrollX(e.nativeEvent.contentOffset.x),
    [],
  );

  // Pixels encore masqués à droite → nombre de chips restants. Un chip n'est
  // compté que s'il est masqué à plus de moitié : à peine rogné, il reste lisible
  // et ne doit pas gonfler le compteur.
  const hiddenPx = Math.max(0, cmdContentW - cmdViewportW - cmdScrollX);
  const hiddenCount = Math.floor(hiddenPx / CMD_CHIP_W + 0.5);


  return (
    <View {...panHandlers} style={styles.header}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: user.avColor }]}>
          <Text style={[styles.avatarText, { color: user.avTextColor }]}>{user.initials}</Text>
          <View style={[styles.badge, { backgroundColor: user.badgeColor }]}>
            <Text style={styles.badgeText}>{user.orderCount}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.name}</Text>
          {hasMultiple && zones.length > 1 ? (
            /* Multi-zones : chips de ZONES (les Cmd sont sous les onglets). */
            <View style={styles.cmdRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cmdScroll}
                style={{ flexShrink: 1 }}
                onScroll={handleCmdScroll}
                scrollEventThrottle={16}
                onLayout={handleCmdLayout}
                onContentSizeChange={handleCmdContentSize}
              >
                {zones.map((z) => (
                  <TouchableOpacity
                    key={z}
                    style={[styles.cmdChip, selectedZone === z && styles.cmdChipActive]}
                    onPress={() => onSelectZone(z)}
                  >
                    <Text
                      style={[
                        styles.cmdChipText,
                        selectedZone === z && styles.cmdChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {z}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Débordement : « +N » tant que la liste n'a pas été scrollée. */}
              {hiddenCount > 0 && (
                <View style={styles.cmdMore}>
                  <Text style={styles.cmdMoreText}>+{hiddenCount}</Text>
                </View>
              )}
            </View>
          ) : hasMultiple ? (
            /* Zone unique (livraison ou sur place) : chips Cmd 1/2/3…
               dans le header, comme avant. */
            <View style={styles.cmdRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cmdScroll}
                style={{ flexShrink: 1 }}
                onScroll={handleCmdScroll}
                scrollEventThrottle={16}
                onLayout={handleCmdLayout}
                onContentSizeChange={handleCmdContentSize}
              >
                {orderList.map((o, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.cmdChip, selectedOrderIdx === idx && styles.cmdChipActive]}
                    onPress={() => onSelectOrder(idx)}
                  >
                    <Text
                      style={[
                        styles.cmdChipText,
                        selectedOrderIdx === idx && styles.cmdChipTextActive,
                      ]}
                    >
                      Cmd {(o as any).rank ?? idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {hiddenCount > 0 && (
                <View style={styles.cmdMore}>
                  <Text style={styles.cmdMoreText}>+{hiddenCount}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.userAddr} numberOfLines={1}>
              {user.zone ? tr("Zone de livraison : {{a}}", { a: user.zone }) : user.addr}
            </Text>
          )}
        </View>
      </View>
      {/* Corbeille : annuler la commande SÉLECTIONNÉE (maquette, pas encore branchée). */}
    <TouchableOpacity style={styles.trashBtn} onPress={onDelete} activeOpacity={0.8} accessibilityLabel={tr("Annuler la commande")}>
      <Ionicons name="trash-outline" size={20} color={DS.dangerInk} />
    </TouchableOpacity>
  </View>
  );
}
