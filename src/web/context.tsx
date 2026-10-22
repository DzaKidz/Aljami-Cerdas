import { createContext, useContext } from "react";
import type { Bootstrap } from "../domain/contracts.js";

export const AppContext = createContext<{ data: Bootstrap; refresh: () => Promise<void>; notify: (message: string) => void } | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("Konteks aplikasi tidak tersedia.");
  return context;
}
