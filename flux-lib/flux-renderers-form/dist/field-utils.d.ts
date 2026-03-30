import { type CompiledValidationBehavior, type FormFieldStateSnapshot, type FormRuntime, type RendererComponentProps, type SchemaFieldRule } from '@nop-chaos/flux-core';
import { useRenderScope } from '@nop-chaos/flux-react';
export declare const formLabelFieldRule: SchemaFieldRule;
export declare const defaultValidationBehavior: CompiledValidationBehavior;
export declare function getFieldValidationBehavior(name: string, currentForm: FormRuntime | undefined): CompiledValidationBehavior;
export declare function shouldValidateOn(name: string, currentForm: FormRuntime | undefined, trigger: 'change' | 'blur' | 'submit'): boolean;
export declare function shouldShowFieldError(behavior: CompiledValidationBehavior, state: {
    touched: boolean;
    dirty: boolean;
    visited: boolean;
    submitting: boolean;
}): boolean;
export declare function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown;
export declare function readCheckboxGroupValue(scope: ReturnType<typeof useRenderScope>, name: string): string[];
export declare function useBoundFieldValue(name: string, currentForm: FormRuntime | undefined): unknown;
export declare function createFieldHandlers(args: {
    name: string;
    currentForm: FormRuntime | undefined;
    scope: ReturnType<typeof useRenderScope>;
    setValue: (value: unknown) => void;
}): {
    onFocus(): void;
    onChange(nextValue: unknown): void;
    onBlur(): void;
};
export declare function resolveFieldLabelContent(props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>): import("react").ReactNode;
export declare function resolveFieldLabelText(props: Pick<RendererComponentProps, 'props' | 'meta'>, fallback?: string): string | undefined;
export declare function getChildFieldUiState(input: {
    behavior: CompiledValidationBehavior;
    fieldState: FormFieldStateSnapshot;
}): {
    error: import("@nop-chaos/flux-core").ValidationError | undefined;
    touched: boolean;
    dirty: boolean;
    visited: boolean;
    showError: boolean;
    className: string;
    'data-child-field-visited': true | undefined;
    'data-child-field-touched': true | undefined;
    'data-child-field-dirty': true | undefined;
    'data-child-field-invalid': true | undefined;
};
export declare function useFieldPresentation(name: string, currentForm: FormRuntime | undefined): {
    fieldState: {
        error: import("@nop-chaos/flux-core").ValidationError | undefined;
        validating: boolean;
        touched: boolean;
        dirty: boolean;
        visited: boolean;
        submitting: boolean;
    };
    showError: boolean;
    className: string;
    'data-field-visited': true | undefined;
    'data-field-touched': true | undefined;
    'data-field-dirty': true | undefined;
    'data-field-invalid': true | undefined;
};
export declare function useCompositeChildFieldState(path: string): FormFieldStateSnapshot;
