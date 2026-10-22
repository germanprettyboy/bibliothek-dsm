import * as React from "react";
import { Toaster as Sonner } from "sonner";

// notices at the bottom (shadcn/ui Sonner) as a glass surface. Text only, no icons.
// Position and width of the list and the notice: `.toaster` in styles.css (Sonner's own CSS beats Tailwind classes)
function Toaster(props) {
  return (
    <Sonner
      position="bottom-center"
      className="toaster"
      // fixed instead of from getComputedStyle(<html>): Sonner would otherwise ask on every render; after a language
      // switch that forces a style recalculation of the whole page in the middle of the click
      dir="ltr"
      offset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))" }}
      mobileOffset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          // font-sans: Sonner sets its own system font on the toaster, which would otherwise override Fira Sans
          toast: "toast glass font-sans rounded-2xl px-[18px] py-3 text-m",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
