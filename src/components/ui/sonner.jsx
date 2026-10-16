import * as React from "react";
import { Toaster as Sonner } from "sonner";

// Hinweise unten (shadcn/ui Sonner) als Glas-Fläche. Nur Text, keine Symbole.
function Toaster(props) {
  return (
    <Sonner
      position="bottom-center"
      // Fest statt aus getComputedStyle(<html>): Sonner fragt sonst bei jedem Neuzeichnen, nach dem Sprachwechsel
      // erzwingt das eine Stil-Neuberechnung der ganzen Seite mitten im Klick
      dir="ltr"
      offset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))" }}
      mobileOffset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "toast glass relative mx-auto w-max max-w-[min(30rem,calc(100vw-32px))] rounded-2xl px-[18px] py-3 text-m",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
