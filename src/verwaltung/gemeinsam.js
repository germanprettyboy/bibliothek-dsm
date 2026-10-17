/* Was die verschlüsselte Verwaltung (werkzeuge/quelle/verwaltung/) von dieser Seite bekommt: React und die
   gemeinsamen Bausteine. Die Verwaltung wird mit diesen Modulen als „extern“ gebaut (admin-verschluesseln.js) und
   findet sie zur Laufzeit hier (window.DSM_GEMEINSAM[Modulname]). So gibt es nur ein React und eine Sprache. */
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as ReactDOM from "react-dom";

import * as button from "@/components/ui/button";
import * as card from "@/components/ui/card";
import * as dialog from "@/components/ui/dialog";
import * as input from "@/components/ui/input";
import * as label from "@/components/ui/label";
import * as radioGroup from "@/components/ui/radio-group";
import * as skeleton from "@/components/ui/skeleton";
import * as sonner from "@/components/ui/sonner";
import * as switchUi from "@/components/ui/switch";
import * as tabs from "@/components/ui/tabs";
import * as textarea from "@/components/ui/textarea";
import * as toggle from "@/components/ui/toggle";
import * as toggleGroup from "@/components/ui/toggle-group";
import * as fenster from "@/components/fenster";
import * as hinweis from "@/lib/hinweis";
import * as speicher from "@/lib/speicher";
import * as sprache from "@/lib/sprache";
import * as utils from "@/lib/utils";

export const GEMEINSAM = {
  "react": React,
  "react/jsx-runtime": jsxRuntime,
  "react-dom": ReactDOM,
  "@/components/ui/button": button,
  "@/components/ui/card": card,
  "@/components/ui/dialog": dialog,
  "@/components/ui/input": input,
  "@/components/ui/label": label,
  "@/components/ui/radio-group": radioGroup,
  "@/components/ui/skeleton": skeleton,
  "@/components/ui/sonner": sonner,
  "@/components/ui/switch": switchUi,
  "@/components/ui/tabs": tabs,
  "@/components/ui/textarea": textarea,
  "@/components/ui/toggle": toggle,
  "@/components/ui/toggle-group": toggleGroup,
  "@/components/fenster": fenster,
  "@/lib/hinweis": hinweis,
  "@/lib/speicher": speicher,
  "@/lib/sprache": sprache,
  "@/lib/utils": utils,
};
