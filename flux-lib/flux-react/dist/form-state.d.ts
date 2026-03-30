import type { FormErrorQuery, FormFieldStateSnapshot, FormStoreState, ValidationError } from '@nop-chaos/flux-core';
export declare const EMPTY_FORM_STORE_STATE: FormStoreState;
export declare function selectCurrentFormErrors(state: FormStoreState, query?: FormErrorQuery): ValidationError[];
export declare function selectCurrentFormFieldState(state: FormStoreState, path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
