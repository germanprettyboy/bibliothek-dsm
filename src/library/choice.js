/* Choice of book recommendations (localStorage dsm-recs: {want, group}). null = never asked. */
import { useSyncExternalStore } from "react";

import { store } from "@/lib/storage";

export const GROUPS = ["middle", "upper", "adult-fiction", "adult-nonfiction", "adult-bio"];

let choice = store.json("dsm-recs");
const listeners = new Set();

export const getChoice = () => choice;
export function setChoice(p) {
  choice = p;
  store.set("dsm-recs", JSON.stringify(p));
  listeners.forEach(fn => fn());
}
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const useChoice = () => useSyncExternalStore(subscribe, getChoice);
