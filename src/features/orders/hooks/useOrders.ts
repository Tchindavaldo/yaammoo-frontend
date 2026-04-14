import { useOrdersContext } from "../context/OrderContext";

export const useOrders = () => {
  return useOrdersContext();
};
