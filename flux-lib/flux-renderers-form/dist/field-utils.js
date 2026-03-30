import { getIn, getCompiledValidationField } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useAggregateError, useChildFieldState, useCurrentFormState, useOwnedFieldState, useScopeSelector } from '@nop-chaos/flux-react';
export const formLabelFieldRule = {
    key: 'label',
    kind: 'value-or-region',
    regionKey: 'label'
};
export const defaultValidationBehavior = {
    triggers: ['blur'],
    showErrorOn: ['touched', 'submit']
};
export function getFieldValidationBehavior(name, currentForm) {
    if (!currentForm || !name) {
        return defaultValidationBehavior;
    }
    const field = getCompiledValidationField(currentForm.validation, name);
    return field?.behavior ?? currentForm.validation?.behavior ?? defaultValidationBehavior;
}
export function shouldValidateOn(name, currentForm, trigger) {
    return getFieldValidationBehavior(name, currentForm).triggers.includes(trigger);
}
export function shouldShowFieldError(behavior, state) {
    return behavior.showErrorOn.some((trigger) => {
        switch (trigger) {
            case 'touched':
                return state.touched;
            case 'dirty':
                return state.dirty;
            case 'visited':
                return state.visited;
            case 'submit':
                return state.submitting;
        }
    });
}
export function readFieldValue(scope, name) {
    return name ? scope.get(name) ?? '' : '';
}
export function readCheckboxGroupValue(scope, name) {
    const value = readFieldValue(scope, name);
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
}
export function useBoundFieldValue(name, currentForm) {
    const formValue = useCurrentFormState((state) => (name ? getIn(state.values, name) : undefined), Object.is);
    const scopeValue = useScopeSelector((scopeData) => (name ? getIn(scopeData, name) : undefined), Object.is);
    return currentForm ? formValue : scopeValue;
}
export function createFieldHandlers(args) {
    const { name, currentForm, scope, setValue } = args;
    return {
        onFocus() {
            if (currentForm && name) {
                currentForm.visitField(name);
            }
        },
        onChange(nextValue) {
            if (currentForm) {
                setValue(nextValue);
                if (shouldValidateOn(name, currentForm, 'change') && currentForm.isTouched(name)) {
                    void currentForm.validateField(name);
                }
                return;
            }
            scope.update(name, nextValue);
        },
        onBlur() {
            if (currentForm && name) {
                currentForm.touchField(name);
                if (shouldValidateOn(name, currentForm, 'blur')) {
                    void currentForm.validateField(name);
                }
            }
        }
    };
}
function useFormFieldState(name) {
    return useOwnedFieldState(name);
}
export function resolveFieldLabelContent(props) {
    return resolveRendererSlotContent(props, 'label', { metaKey: 'label' });
}
export function resolveFieldLabelText(props, fallback) {
    if (typeof props.props.label === 'string' && props.props.label) {
        return props.props.label;
    }
    if (typeof props.meta.label === 'string' && props.meta.label) {
        return props.meta.label;
    }
    return fallback;
}
export function getChildFieldUiState(input) {
    const error = input.fieldState.error;
    const touched = input.fieldState.touched;
    const dirty = input.fieldState.dirty;
    const visited = input.fieldState.visited;
    const showError = Boolean(error &&
        shouldShowFieldError(input.behavior, {
            touched,
            dirty,
            visited,
            submitting: input.fieldState.submitting
        }));
    return {
        error,
        touched,
        dirty,
        visited,
        showError,
        className: 'grid gap-1.5',
        'data-child-field-visited': visited || undefined,
        'data-child-field-touched': touched || undefined,
        'data-child-field-dirty': dirty || undefined,
        'data-child-field-invalid': showError || undefined,
    };
}
export function useFieldPresentation(name, currentForm) {
    const fieldState = useFormFieldState(name);
    const behavior = getFieldValidationBehavior(name, currentForm);
    const aggregateError = useAggregateError(name);
    const visibleError = aggregateError ?? fieldState.error;
    const showError = Boolean(visibleError &&
        shouldShowFieldError(behavior, {
            touched: fieldState.touched,
            dirty: fieldState.dirty,
            visited: fieldState.visited,
            submitting: fieldState.submitting
        }));
    return {
        fieldState: {
            ...fieldState,
            error: visibleError
        },
        showError,
        className: 'nop-field',
        'data-field-visited': fieldState.visited || undefined,
        'data-field-touched': fieldState.touched || undefined,
        'data-field-dirty': fieldState.dirty || undefined,
        'data-field-invalid': showError || undefined,
    };
}
export function useCompositeChildFieldState(path) {
    return useChildFieldState(path);
}
