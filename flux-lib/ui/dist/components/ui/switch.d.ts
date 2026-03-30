import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
declare const Switch: React.ForwardRefExoticComponent<Omit<SwitchPrimitive.SwitchProps & React.RefAttributes<HTMLButtonElement>, "ref"> & {
    size?: "sm" | "default";
} & React.RefAttributes<HTMLButtonElement>>;
export { Switch };
