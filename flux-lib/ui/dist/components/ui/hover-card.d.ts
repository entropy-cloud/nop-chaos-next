import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
declare function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare const HoverCardTrigger: React.ForwardRefExoticComponent<Omit<HoverCardPrimitive.HoverCardTriggerProps & React.RefAttributes<HTMLAnchorElement>, "ref"> & React.RefAttributes<HTMLAnchorElement>>;
declare const HoverCardContent: React.ForwardRefExoticComponent<Omit<HoverCardPrimitive.HoverCardContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export { HoverCard, HoverCardTrigger, HoverCardContent };
