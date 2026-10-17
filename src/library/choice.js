/* Wahl der Buchempfehlungen (localStorage dsm-empf: {want, gruppe}). null = noch nie gefragt. */
import { useSyncExternalStore } from "react";

import { store } from "@/lib/speicher";

export const GROUPS = ["mittelstufe", "oberstufe", "erw-roman", "erw-sach", "erw-bio"];

let wahl = store.json("dsm-empf");
const hoerer = new Set();

export const getWahl = () => wahl;
export function setWahl(p) {
  wahl = p;
  store.set("dsm-empf", JSON.stringify(p));
  hoerer.forEach(fn => fn());
}
const abo = fn => { hoerer.add(fn); return () => hoerer.delete(fn); };
export const useWahl = () => useSyncExternalStore(abo, getWahl);
