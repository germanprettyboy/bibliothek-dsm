/* "Herunterladen ▾" menu of tab "Pflege" (maintenance lists, location list, inventory). */
import * as React from "react";
import { ChevronDownIcon, DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/language";
import "./strings-care";

// "Herunterladen ▾": Excel first, CSV second. sections: [[label | null, [{ text, on, props }]]]
// Not modal (the tab is no dialog): a modal menu locks clicks on the page until its closing animation has ended, so
// opening it again right after a download did nothing. The download runs after the menu has closed.
export function DownloadMenu({ triggerProps, label, sections }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const pick = fn => () => { setOpen(false); setTimeout(fn, 0); };
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" {...triggerProps}>
          <DownloadIcon aria-hidden="true" /><span>{label || t("mxDl")}</span><ChevronDownIcon aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {sections.map(([head, items], i) => (
          <React.Fragment key={i}>
            {i ? <DropdownMenuSeparator /> : null}
            {head ? <DropdownMenuLabel>{head}</DropdownMenuLabel> : null}
            {items.map(it => <DropdownMenuItem key={it.text} onSelect={pick(it.on)} {...it.props}>{it.text}</DropdownMenuItem>)}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
