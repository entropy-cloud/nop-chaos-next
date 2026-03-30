import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: (props?: ({
    variant?: "default" | "destructive" | "link" | "secondary" | "success" | "warning" | "outline" | "ghost" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare const Badge: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & VariantProps<(props?: ({
    variant?: "default" | "destructive" | "link" | "secondary" | "success" | "warning" | "outline" | "ghost" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string> & {
    asChild?: boolean;
} & React.RefAttributes<HTMLSpanElement>>;
export { Badge, badgeVariants };
