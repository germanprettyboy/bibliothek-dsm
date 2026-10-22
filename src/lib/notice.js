import * as React from "react";
import { toast } from "sonner";

import { log } from "@/lib/storage";

// Notice at the bottom (shadcn Sonner, <Toaster> in the page); a new notice replaces the old one.
// With onClick the whole notice is a button (e.g. "open the settings"): Sonner starts no swipe on a button,
// and a click closes the notice.
export function notify(msg, onClick) {
  log("Notice", msg);
  const body = onClick
    ? React.createElement("button", {
        type: "button", className: "toast-btn",
        onClick: () => { toast.dismiss("notice"); onClick(); },
      }, msg)
    : msg;
  toast(body, { id: "notice", duration: 3600, className: onClick ? "has-btn" : undefined });
}
