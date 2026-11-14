"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { View } from "react-native";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { styles } from "./create-boutique/styles";
import { useCreateBoutique } from "./create-boutique/useCreateBoutique";
import { groupZonesByLieu, lieuKey } from "./create-boutique/groupZones";
import { hourToDate } from "./create-boutique/parseBoutique";
import { BoutiqueInfoPage } from "./create-boutique/BoutiqueInfoPage";
import { ZoneFormSheet } from "./create-boutique/ZoneFormSheet";
import { ZoneListSheet } from "./create-boutique/ZoneListSheet";
import {
  TimePickerOverlay,
  CityPickerModal,
  BoutiqueToast,
} from "./create-boutique/BoutiquePickers";
import { t, useLanguage } from "@/src/i18n";

interface CreateBoutiquePanelProps {
  onCancel: () => void;
}

/**
 * Panneau plein ecran de CREATION de boutique, en page unique : infos
 * generales + bloc « Zone de livraison » (sheets d'ajout et de consultation) +
 * pickup, bouton « Creer ma boutique » fixe en bas. L'etat vit dans
 * `useCreateBoutique`.
 *
 * Structure calquee sur `EditBoutiquePanel`, mais entierement DUPLIQUEE dans
 * `create-boutique/` (R16) : aucun fichier d'`edit-boutique/` n'est importe ici,
 * les deux ecrans peuvent donc diverger sans risque l'un pour l'autre.
 */
export const CreateBoutiquePanel: React.FC<CreateBoutiquePanelProps> = ({
  onCancel,
}) => {
  useLanguage();
  // Rendu dans (tabs)/boutique, navbar par-dessus : hauteur REELLE de la
  // navbar, safe-area comprise (source unique R19).
  const tabBarHeight = useTabBarHeight();
  const s = useCreateBoutique({ onCancel });
  // Sheet de consultation des zones deja saisies.
  const [showZoneList, setShowZoneList] = React.useState(false);

  const groups = groupZonesByLieu(
    s.deliveryHours,
    s.periodicEnabled,
    s.periodicZonesByHour,
    s.expressZones,
  );

  // Ouvre le bottom sheet sur une zone existante (clic sur une ligne).
  // `entry.hour` vide = ligne EXPRESS seule (l'express n'a pas d'heure).
  const openZone = (
    lieu: string,
    entry: { hour: string; periodicPrix?: string; expressPrix?: string },
  ) => {
    s.setViewAllHours(false);
    s.setActiveHour(entry.hour || null);
    s.setNewHour(entry.hour);
    s.setShowEditForm(true);
    s.setFormPeriodic(entry.periodicPrix !== undefined);
    s.setFormExpress(entry.expressPrix !== undefined);
    if (entry.hour) s.setTempDeliveryTime(hourToDate(entry.hour));
    s.setPeriodicDraft({ lieu, prix: entry.periodicPrix || "" });
    s.setExpressDraft({ lieu, prix: entry.expressPrix || "" });
    const pIdx = entry.hour
      ? (s.periodicZonesByHour[entry.hour]?.findIndex((z) => z.lieu === lieu) ?? -1)
      : -1;
    const eIdx = s.expressZones.findIndex((z) => lieuKey(z.lieu) === lieuKey(lieu));
    s.setPeriodicEditIdx(entry.periodicPrix !== undefined ? pIdx : null);
    s.setExpressEditIdx(entry.expressPrix !== undefined && eIdx >= 0 ? eIdx : null);
  };

  // Depuis la liste : on ferme d'abord ce sheet, puis on ouvre le formulaire.
  // Deux Modals ouverts en meme temps s'annulent (le second ne s'affiche pas).
  const openZoneFromList = (
    lieu: string,
    entry: { hour: string; periodicPrix?: string; expressPrix?: string },
  ) => {
    setShowZoneList(false);
    setTimeout(() => openZone(lieu, entry), 260);
  };

  // Ouvre le bottom sheet vierge (bouton « Ajouter une adresse »).
  const openNewZone = () => {
    s.setShowEditForm(true);
    s.setActiveHour(null);
    s.setNewHour("");
    s.setPeriodicDraft({ lieu: "", prix: "" });
    s.setExpressDraft({ lieu: "", prix: "" });
    s.setPeriodicEditIdx(null);
    s.setExpressEditIdx(null);
    s.setFormPeriodic(true);
    s.setFormExpress(false);
  };

  return (
    <View style={styles.overlay}>
      {/* Fond blanc opaque FIXE sous le header : couvre toute la zone de contenu
          (evite que le settings transparaisse au scroll). Derriere le header, on
          laisse transparent pour que le BlurView floute le settings. */}
      <View
        style={[styles.contentBg, { top: s.headerHeight }]}
        pointerEvents="none"
      />

      <TabHeader
        title={t("Créer ma boutique")}
        subtitle={t("Informations du fast-food")}
        right={
          <HeaderPill
            label={t("Retour")}
            icon="arrow-back-outline"
            onPress={onCancel}
          />
        }
        onHeightChange={s.setHeaderHeight}
      />

      {/* Pas de KeyboardAvoidingView : il remonterait aussi le bouton de
          validation fixe en bas. Le ScrollView interne (keyboardShouldPersistTaps)
          suffit a gerer la saisie sous le clavier. */}
      <View style={[{ flex: 1, paddingTop: s.headerHeight }]}>
        {/* Conteneur borne en hauteur (pas de ScrollView ici) : la page gere son
            propre scroll interne, ce qui permet a la carte des adresses de
            s'etendre sans deborder sous la tab bar. */}
        <View
          style={[
            styles.cardGrid,
            { flex: 1, paddingBottom: tabBarHeight + 8 },
          ]}
        >
          <BoutiqueInfoPage
            keyboardOffset={s.headerHeight}
            image={s.image}
            pickImage={s.pickImage}
            name={s.name}
            setName={s.setName}
            openTime={s.openTime}
            closeTime={s.closeTime}
            formatTime={s.formatTime}
            onOpenTimePress={() => s.setShowOpenPicker(true)}
            onCloseTimePress={() => s.setShowClosePicker(true)}
            number={s.number}
            setNumber={s.setNumber}
            momoNumber={s.momoNumber}
            setMomoNumber={s.setMomoNumber}
            whatsappNumber={s.whatsappNumber}
            setWhatsappNumber={s.setWhatsappNumber}
            selectedCities={s.selectedCities}
            onCityPress={() => s.setShowCityPicker(true)}
            onAddZone={openNewZone}
            onViewZones={() => setShowZoneList(true)}
            orderLeadTime={s.orderLeadTime}
            setOrderLeadTime={s.setOrderLeadTime}
            advanceDays={s.advanceDays}
            setAdvanceDays={s.setAdvanceDays}
            pickupAllowed={s.pickupAllowed}
            setPickupAllowed={s.setPickupAllowed}
            loading={s.loading}
            onSubmit={s.handleCreate}
          />
        </View>
      </View>

      <ZoneListSheet
        visible={showZoneList}
        onClose={() => setShowZoneList(false)}
        groups={groups}
        selectedHour={s.viewAllHours ? null : s.activeHour}
        selectedLieu={
          s.viewAllHours
            ? null
            : s.periodicDraft.lieu || s.expressDraft.lieu || null
        }
        onSelect={openZoneFromList}
      />

      <ZoneFormSheet
        visible={s.showEditForm}
        onClose={() => s.setShowEditForm(false)}
        activeHour={s.activeHour}
        newHour={s.newHour}
        setNewHour={s.setNewHour}
        formPeriodic={s.formPeriodic}
        setFormPeriodic={s.setFormPeriodic}
        formExpress={s.formExpress}
        setFormExpress={s.setFormExpress}
        periodicDraft={s.periodicDraft}
        setPeriodicDraft={s.setPeriodicDraft}
        expressDraft={s.expressDraft}
        setExpressDraft={s.setExpressDraft}
        tempDeliveryTime={s.tempDeliveryTime}
        setTempDeliveryTime={s.setTempDeliveryTime}
        showTimePicker={s.showTimePicker}
        setShowTimePicker={s.setShowTimePicker}
        onDelete={() => {
          s.deleteZoneForm();
          s.setShowEditForm(false);
          s.setViewAllHours(true);
        }}
        onSave={s.saveZoneForm}
        fallbackHour={s.deliveryHours[0] || ""}
      />

      {s.showOpenPicker && (
        <TimePickerOverlay
          value={s.openTime}
          onChange={s.setOpenTime}
          onDone={() => s.setShowOpenPicker(false)}
        />
      )}

      {s.showClosePicker && (
        <TimePickerOverlay
          value={s.closeTime}
          onChange={s.setCloseTime}
          onDone={() => s.setShowClosePicker(false)}
        />
      )}

      {s.showCityPicker && (
        <CityPickerModal
          search={s.citySearch}
          setSearch={s.setCitySearch}
          selectedCities={s.selectedCities}
          setSelectedCities={s.setSelectedCities}
          onDone={() => s.setShowCityPicker(false)}
        />
      )}

      {s.toastVisible && (
        <BoutiqueToast config={s.toastConfig} animY={s.toastAnimY} />
      )}
    </View>
  );
};
