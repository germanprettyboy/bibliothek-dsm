import { toast } from "sonner";

import { log } from "@/lib/speicher";

// Hinweis unten (shadcn Sonner, <Toaster> in der Seite); ein neuer Hinweis ersetzt den alten
export function hinweis(msg) {
  log("Hinweis", msg);
  toast(msg, { id: "hinweis", duration: 3600 });
}
