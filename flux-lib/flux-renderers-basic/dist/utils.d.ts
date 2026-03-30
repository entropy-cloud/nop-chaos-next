export declare function classNames(...values: Array<string | undefined | false>): string;
export declare function resolveDirection(direction?: string): "flex-col" | "flex-row";
export declare const GAP_TOKENS: Record<string, string>;
export declare function resolveGap(gap: number | string | undefined): {
    className?: string;
    style?: React.CSSProperties;
};
