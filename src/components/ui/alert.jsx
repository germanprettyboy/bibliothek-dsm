import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn/ui Alert in the DSM design: notice of the admin page, a framed surface with a colored bar on the left
// (green = done, yellow = check, red = error), readable inside a card and on the page. Class "flag" stays as the test hook.
const alertVariants = cva("flag m-0 rounded-r-md border border-l-4 border-border bg-background px-4 py-3 text-foreground", {
  variants: {
    variant: {
      default: "border-l-green",
      mid: "border-l-yellow",
      warn: "border-l-red",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), variant, className)} {...props} />;
}

export { Alert, alertVariants };
