/* What the encrypted admin app (tools/source/admin/) gets from this page: React and the shared
   building blocks. The admin app is built with these modules as "external" (encrypt-admin.js) and
   finds them here at runtime (window.DSM_SHARED[module name]). That way there is only one React and one language. */
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as ReactDOM from "react-dom";

import * as button from "@/components/ui/button";
import * as accordion from "@/components/ui/accordion";
import * as card from "@/components/ui/card";
import * as checkbox from "@/components/ui/checkbox";
import * as dialog from "@/components/ui/dialog";
import * as dropdownMenu from "@/components/ui/dropdown-menu";
import * as input from "@/components/ui/input";
import * as label from "@/components/ui/label";
import * as popover from "@/components/ui/popover";
import * as radioGroup from "@/components/ui/radio-group";
import * as select from "@/components/ui/select";
import * as skeleton from "@/components/ui/skeleton";
import * as sonner from "@/components/ui/sonner";
import * as switchUi from "@/components/ui/switch";
import * as tabs from "@/components/ui/tabs";
import * as textarea from "@/components/ui/textarea";
import * as toggle from "@/components/ui/toggle";
import * as toggleGroup from "@/components/ui/toggle-group";
import * as tooltip from "@/components/ui/tooltip";
import * as glassDialog from "@/components/glass-dialog";
import * as announcement from "@/components/announcement";
import * as notice from "@/lib/notice";
import * as storage from "@/lib/storage";
import * as language from "@/lib/language";
import * as utils from "@/lib/utils";

export const SHARED = {
  "react": React,
  "react/jsx-runtime": jsxRuntime,
  "react-dom": ReactDOM,
  "@/components/ui/button": button,
  "@/components/ui/accordion": accordion,
  "@/components/ui/card": card,
  "@/components/ui/checkbox": checkbox,
  "@/components/ui/dialog": dialog,
  "@/components/ui/dropdown-menu": dropdownMenu,
  "@/components/ui/input": input,
  "@/components/ui/label": label,
  "@/components/ui/popover": popover,
  "@/components/ui/radio-group": radioGroup,
  "@/components/ui/select": select,
  "@/components/ui/skeleton": skeleton,
  "@/components/ui/sonner": sonner,
  "@/components/ui/switch": switchUi,
  "@/components/ui/tabs": tabs,
  "@/components/ui/textarea": textarea,
  "@/components/ui/toggle": toggle,
  "@/components/ui/toggle-group": toggleGroup,
  "@/components/ui/tooltip": tooltip,
  "@/components/glass-dialog": glassDialog,
  "@/components/announcement": announcement,
  "@/lib/notice": notice,
  "@/lib/storage": storage,
  "@/lib/language": language,
  "@/lib/utils": utils,
};
