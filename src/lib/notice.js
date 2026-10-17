import { toast } from "sonner";

import { log } from "@/lib/storage";

// Notice at the bottom (shadcn Sonner, <Toaster> in the page); a new notice replaces the old one
export function notify(msg) {
  log("Notice", msg);
  toast(msg, { id: "notice", duration: 3600 });
}
