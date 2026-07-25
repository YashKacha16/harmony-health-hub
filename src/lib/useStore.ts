import { useSyncExternalStore } from "react";
import { store } from "./store";

export function useDB() {
  return useSyncExternalStore(
    (l) => store.subscribe(l),
    () => store.get(),
    () => store.get(),
  );
}
