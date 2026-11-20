// Styles du sheet commande marchand (extraits de MerchantOrderBottomSheet, R26).
import { Platform, StyleSheet } from 'react-native';
import { DS } from "@/src/theme/ds";

// iOS aligne sur le sheet client (450) ; Android garde 490.
export const SHEET_HEIGHT = Platform.OS === 'ios' ? 450 : 490;
// Hauteur de la barre de chips « Cmd » (chip 24 + paddings 8/8 + trait) : le
// sheet grandit d'autant quand elle est affichee, pour ne rien rogner en bas.
export const CMD_BAR_HEIGHT = 41;

// ─── Styles ───────────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12, shadowRadius: 15, elevation: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
  },
  trashBtn: {
    width: 40, height: 40, borderRadius: 20, marginLeft: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: DS.dangerSoft,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  badge: {
    position: 'absolute', bottom: -2, right: -4,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  userAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  // Chips « Cmd » dans le header (multi-commandes)
  cmdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cmdScroll: { flexDirection: 'row', gap: 6, paddingRight: 2 },
  cmdChip: {
    minWidth: 28, height: 24, paddingHorizontal: 8, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: DS.gray100, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cmdChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  // Barre des « Cmd » de la zone, juste sous les onglets.
  // Le contenu de l'onglet a déjà son propre padding haut : on remonte la barre
  // dessus (marge négative) pour resserrer l'écart, sans toucher aux chips.
  zoneCmdBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: DS.gray100,
    marginBottom: -10,
  },
  zoneCmdScroll: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8,
  },
  cmdChipText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  cmdChipTextActive: { color: '#FFFFFF' },
  cmdMore: {
    height: 24, paddingHorizontal: 7, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB',
  },
  cmdMoreText: { fontSize: 10, fontWeight: '800', color: '#4B5563' },
  // Top tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: DS.gray100 },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#111827' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
});
