/* Navigation bar of the admin page: tabs, help, lock. (Placeholder – rebuilt by the navigation work package.) */
import * as React from "react";
import { BarChart3Icon, DatabaseIcon, ImageIcon, InfoIcon, LockIcon, SparklesIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language";

// Order of the tabs: [value, label key, icon]; data-tab and #tab-<value> are test hooks
export const TABS = [
  ["catalog", "tabCatalog", DatabaseIcon],
  ["covers", "tabCovers", ImageIcon],
  ["care", "tabCare", WrenchIcon],
  ["stats", "tabStats", BarChart3Icon],
  ["recs", "tabRecs", SparklesIcon],
  ["info", "tabInfo", InfoIcon],
];

export function AdminNav({ lock, onHelp }) {
  const { t } = useLanguage();
  return (
    <div className="adm-top mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <TabsList className="tabs">
        {TABS.map(([v, k]) => <TabsTrigger key={v} value={v} data-tab={v}>{t(k)}</TabsTrigger>)}
      </TabsList>
      <Button variant="ghost" id="help-btn" onClick={onHelp} aria-label={t("help")}>?</Button>
      <Button variant="ghost" size="icon" id="lock-btn" onClick={lock} aria-label={t("lockAgain")}><LockIcon aria-hidden="true" strokeWidth={2} /></Button>
    </div>
  );
}
