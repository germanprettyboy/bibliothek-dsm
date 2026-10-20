import * as React from "react";
import { Toaster as Sonner } from "sonner";

// notices at the bottom (shadcn/ui Sonner) as a glass surface. Text only, no icons.
function Toaster(props) {
  return (
    <Sonner
      position="bottom-center"
      // fixed instead of from getComputedStyle(<html>): Sonner would otherwise ask on every render; after a language
      // switch that forces a style recalculation of the whole page in the middle of the click
      dir="ltr"
      // the list spans the whole width and the toast centers itself in it: Sonner places unstyled toasts at the
      // left edge of its 356 px list (phone: list 16 px in, toast another 16 px), longer notices sat off center
      style={{ "--width": "100%" }}
      offset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))" }}
      mobileOffset={{ bottom: "calc(18px + env(safe-area-inset-bottom, 0px))", left: "0px", right: "0px" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          // font-sans: Sonner sets its own system font on the toaster, which would otherwise override Fira Sans
          // w-max!: Sonner's phone rule (width: 100% - offsets) would otherwise stretch the toast edge to edge
          toast: "toast glass font-sans inset-x-0 mx-auto w-max! max-w-[min(30rem,calc(100vw-32px))] rounded-2xl px-[18px] py-3 text-m",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
