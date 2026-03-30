import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import { formLabelFieldRule, readCheckboxGroupValue, resolveFieldLabelContent, resolveFieldLabelText, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
export function TagListRenderer(props) {
    const scope = useRenderScope();
    const currentForm = useCurrentForm();
    const name = String(props.props.name ?? props.schema.name ?? '');
    const value = readCheckboxGroupValue(scope, name);
    const presentation = useFieldPresentation(name, currentForm);
    const labelContent = resolveFieldLabelContent(props);
    const labelText = resolveFieldLabelText(props, name);
    const tags = Array.isArray(props.props.tags) ? props.props.tags : [];
    const syncErrorVisibility = React.useCallback(() => {
        if (!currentForm || !name) {
            return;
        }
        if (currentForm.isTouched(name) || currentForm.store.getState().submitting) {
            void currentForm.validateField(name);
        }
    }, [currentForm, name]);
    React.useEffect(() => {
        if (!currentForm || !name) {
            return;
        }
        return currentForm.registerField({
            path: name,
            getValue() {
                return currentForm.scope.get(name);
            },
            validate() {
                const currentValue = currentForm.scope.get(name);
                const currentTags = Array.isArray(currentValue) ? currentValue.map((item) => String(item)) : [];
                if (currentTags.length === 0) {
                    return [
                        {
                            path: name,
                            rule: 'required',
                            message: `${labelText} requires at least one tag`
                        }
                    ];
                }
                return [];
            }
        });
    }, [currentForm, labelText, name]);
    return (_jsxs("label", { className: presentation.className, "data-field-visited": presentation['data-field-visited'], "data-field-touched": presentation['data-field-touched'], "data-field-dirty": presentation['data-field-dirty'], "data-field-invalid": presentation['data-field-invalid'], children: [_jsx(FieldLabel, { content: labelContent }), _jsx("div", { className: "flex flex-wrap gap-2.5", children: tags.map((tag) => {
                    const active = value.includes(tag);
                    return (_jsx(Button, { type: "button", variant: active ? 'secondary' : 'outline', size: "sm", onFocus: () => {
                            if (currentForm && name) {
                                currentForm.visitField(name);
                            }
                        }, onClick: () => {
                            const nextValue = active ? value.filter((item) => item !== tag) : [...value, tag];
                            if (currentForm) {
                                if (!currentForm.isTouched(name)) {
                                    currentForm.touchField(name);
                                }
                                currentForm.setValue(name, nextValue);
                                syncErrorVisibility();
                            }
                            else {
                                scope.update(name, nextValue);
                            }
                        }, children: tag }, tag));
                }) }), _jsx(FieldHint, { errorMessage: presentation.fieldState.error?.message, validating: presentation.fieldState.validating, showError: presentation.showError })] }));
}
export const tagListRendererDefinition = {
    type: 'tag-list',
    component: TagListRenderer,
    fields: [formLabelFieldRule]
};
