import React from "react";
import { WorkOrdersScreen } from "@/src/features/staff/components/WorkOrdersScreen";

/** Mode travail (personnel / livreur) : onglet « En cours ». */
export default function WorkProgressScreen() {
  return <WorkOrdersScreen stage="progress" />;
}
