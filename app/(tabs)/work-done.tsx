import React from "react";
import { WorkOrdersScreen } from "@/src/features/staff/components/WorkOrdersScreen";

/** Mode travail (personnel / livreur) : onglet « Terminé ». */
export default function WorkDoneScreen() {
  return <WorkOrdersScreen stage="done" />;
}
