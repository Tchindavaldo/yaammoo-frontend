import { useEffect, useState } from "react";
import {
  driverService,
  type DriverInfo,
  type DriverProfile,
} from "@/src/features/driver/services/driverService";

/**
 * Note et stats de chaque livreur (GET /driver/:id, scope marchand : ratingAvg,
 * stats.delivered / inProgress). Chargées une fois par livreur ; un échec
 * laisse simplement la ligne sans ces infos.
 */
export const useStaffDriverProfiles = (drivers: DriverInfo[]) => {
  const [profiles, setProfiles] = useState<Record<string, DriverProfile>>({});

  useEffect(() => {
    let alive = true;
    const missing = drivers.filter((d) => !profiles[d.driverId]);
    missing.forEach((d) => {
      driverService.getDriverInfo(d.driverId).then(
        (p) => alive && setProfiles((prev) => ({ ...prev, [d.driverId]: p })),
        () => {},
      );
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers]);

  return profiles;
};
