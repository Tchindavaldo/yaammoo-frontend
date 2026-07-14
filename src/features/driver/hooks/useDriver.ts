import { useDriverContext } from "../context/DriverContext";

export const useDriver = () => {
  return useDriverContext();
};
