import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";
export function Button({ variant = "primary", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "brass"; children: ReactNode }) {
  return <button className={cn("button", `button-${variant}`, className)} {...props}>{children}</button>;
}
