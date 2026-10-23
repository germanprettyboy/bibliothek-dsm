/* Announcement banner (info.js "announcement"): one or two lines on a full-width strip in a logo color (the colors of
   the cover placeholders) or neutral, × on the right. The book list shows it (library/announcement.jsx), the admin
   page previews it live and picks the color with ColorDots. */
import * as React from "react";
import { XIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addStrings } from "@/lib/language";

addStrings({
  de: { annLabel: "Mitteilung", annClose: "Mitteilung schließen" },
  it: { annLabel: "Avviso", annClose: "Chiudi l'avviso" },
});

export const ANNOUNCE_COLORS = ["neutral", "mauve", "yellow", "orange", "blue", "red", "green"];
export const announceColor = c => (ANNOUNCE_COLORS.includes(c) ? c : "neutral");

export function AnnouncementBar({ text, color, closeLabel, onClose, className, ...props }) {
  return (
    <div className={cn("announce-bar", className)} data-color={announceColor(color)} {...props}>
      <div className="wrap flex items-center gap-2 py-1">
        <p className="m-0 min-w-0 flex-1 py-2 font-medium [overflow-wrap:anywhere] [text-wrap:pretty]">{text}</p>
        <Button variant="icon-ghost" size="icon" className="announce-x -mr-3" aria-label={closeLabel} onClick={onClose}>
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// Color choice as dots (radio group: arrow keys, one tab stop); labels = {color: name}
export function ColorDots({ value, onValueChange, labels, className, ...props }) {
  return (
    <RadioGroupPrimitive.Root
      orientation="horizontal" value={announceColor(value)} onValueChange={onValueChange}
      className={cn("flex flex-wrap gap-0.5", className)} {...props}
    >
      {ANNOUNCE_COLORS.map(c => (
        <RadioGroupPrimitive.Item key={c} value={c} data-color={c} className="color-dot" aria-label={labels[c]} title={labels[c]}>
          <span aria-hidden="true" />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
