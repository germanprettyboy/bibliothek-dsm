import * as React from "react";

import { cn } from "@/lib/utils";

// Karte = Abschnitt der Verwaltung (früher .panel)
function Card({ className, ...props }) {
  return <div data-slot="card" className={cn("flex flex-col gap-1.5 rounded-xl border border-border bg-card p-[18px] text-card-foreground", className)} {...props} />;
}

function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn("grid gap-1", className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h2 data-slot="card-title" className={cn("m-0 text-m font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <p data-slot="card-description" className={cn("m-0 text-s text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn("mt-3.5 flex flex-wrap gap-2.5", className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
