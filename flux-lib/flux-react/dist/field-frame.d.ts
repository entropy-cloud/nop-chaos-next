import type { ReactNode } from 'react';
import type { CompiledValidationBehavior } from '@nop-chaos/flux-core';
export interface FieldFrameProps {
    name?: string;
    label?: ReactNode;
    required?: boolean;
    hint?: ReactNode;
    description?: ReactNode;
    layout?: 'default' | 'checkbox' | 'radio';
    validationBehavior?: CompiledValidationBehavior;
    className?: string;
    testid?: string;
    children: ReactNode;
}
export declare function FieldFrame(props: FieldFrameProps): import("react/jsx-runtime").JSX.Element;
