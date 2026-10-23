import * as React from "react";

import { cn } from "@/lib/utils";

// Card = section of the admin page; the same card as on the book list (.card in styles.css: surface, inner line, 16 px radius, p-4)
function Card({ className, ...props }) {
  return <div data-slot="card" className={cn("card flex flex-col gap-1.5 p-4 text-foreground", className)} {...props} />;
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
  return <div data-slot="card-footer" className={cn("mt-4 flex flex-wrap gap-2", className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
