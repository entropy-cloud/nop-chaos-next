import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { Checkbox, Input, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@nop-chaos/ui';
import { createFieldHandlers, formLabelFieldRule, useBoundFieldValue, useFieldPresentation } from '../field-utils';
export function createInputRenderer(inputType) {
    return function InputRenderer(props) {
        const scope = useRenderScope();
        const currentForm = useCurrentForm();
        const name = String(props.props.name ?? props.schema.name ?? '');
        const value = useBoundFieldValue(name, currentForm);
        const presentation = useFieldPresentation(name, currentForm);
        const handlers = createFieldHandlers({
            name,
            currentForm,
            scope,
            setValue(nextValue) {
                currentForm?.setValue(name, nextValue);
            }
        });
        return (_jsx(Input, { type: inputType, value: String(value), "aria-invalid": presentation.showError ? true : undefined, placeholder: props.props.placeholder ? String(props.props.placeholder) : undefined, onFocus: handlers.onFocus, onChange: (event) => handlers.onChange(event.target.value), onBlur: handlers.onBlur }));
    };
}
export function createFieldValidation(nameResolver, email) {
    return {
        kind: 'field',
        valueKind: 'scalar',
        getFieldPath(schema) {
            return nameResolver ? nameResolver(schema) : schema.name;
        },
        collectRules(schema) {
            const rules = email
                ? [{ kind: 'email' }]
                : [];
            if (schema.validate?.api) {
                rules.push({
                    kind: 'async',
                    api: schema.validate.api,
                    debounce: schema.validate.debounce,
                    message: schema.validate.message
                });
            }
            return rules;
        }
    };
}
export const inputRendererDefinitions = [
    {
        type: 'input-text',
        component: createInputRenderer('text'),
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true
    },
    {
        type: 'input-email',
        component: createInputRenderer('email'),
        fields: [formLabelFieldRule],
        validation: createFieldValidation(undefined, true),
        wrap: true
    },
    {
        type: 'input-password',
        component: createInputRenderer('password'),
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true
    },
    {
        type: 'select',
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true,
        component: function SelectRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const value = useBoundFieldValue(name, currentForm);
            const options = Array.isArray(props.props.options) ? props.props.options : [];
            const presentation = useFieldPresentation(name, currentForm);
            const ariaLabel = String(props.meta.label ?? props.props.label ?? name);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue);
                }
            });
            return (_jsxs(Select, { value: String(value), onValueChange: (nextValue) => handlers.onChange(nextValue), children: [_jsx(SelectTrigger, { className: "w-full", "aria-label": ariaLabel, "aria-invalid": presentation.showError ? true : undefined, onFocus: handlers.onFocus, onBlur: handlers.onBlur, children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: options?.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }));
        }
    },
    {
        type: 'textarea',
        fields: [formLabelFieldRule],
        component: function TextareaRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const value = useBoundFieldValue(name, currentForm);
            const presentation = useFieldPresentation(name, currentForm);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue);
                }
            });
            return (_jsx(Textarea, { value: String(value), rows: typeof props.props.rows === 'number' ? props.props.rows : 4, "aria-invalid": presentation.showError ? true : undefined, placeholder: props.props.placeholder ? String(props.props.placeholder) : undefined, onFocus: handlers.onFocus, onChange: (event) => handlers.onChange(event.target.value), onBlur: handlers.onBlur }));
        },
        validation: createFieldValidation(),
        wrap: true
    },
    {
        type: 'checkbox',
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true,
        component: function CheckboxRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const value = Boolean(useBoundFieldValue(name, currentForm));
            const presentation = useFieldPresentation(name, currentForm);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue === 'true');
                }
            });
            const option = props.props.option;
            const optionLabel = option?.label;
            return (_jsxs("span", { className: "inline-flex items-center gap-2.5", children: [_jsx(Checkbox, { checked: value, "aria-invalid": presentation.showError ? true : undefined, "aria-label": optionLabel, onFocus: handlers.onFocus, onCheckedChange: (checked) => handlers.onChange(String(Boolean(checked))), onBlur: handlers.onBlur }), optionLabel ? _jsx("span", { className: "font-medium", children: optionLabel }) : null] }));
        }
    },
    {
        type: 'switch',
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true,
        component: function SwitchRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const value = Boolean(useBoundFieldValue(name, currentForm));
            const presentation = useFieldPresentation(name, currentForm);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue === 'true');
                }
            });
            const option = props.props.option;
            return (_jsxs("span", { className: "inline-flex items-center gap-3", children: [_jsx(Switch, { checked: value, "aria-invalid": presentation.showError ? true : undefined, "aria-label": String(props.meta.label ?? props.props.label ?? name), onFocus: handlers.onFocus, onCheckedChange: (checked) => handlers.onChange(String(Boolean(checked))), onBlur: handlers.onBlur }), _jsx("span", { className: "font-semibold", children: value ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off' })] }));
        }
    },
    {
        type: 'radio-group',
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true,
        component: function RadioGroupRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const value = String(useBoundFieldValue(name, currentForm));
            const options = Array.isArray(props.props.options) ? props.props.options : [];
            const presentation = useFieldPresentation(name, currentForm);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue);
                }
            });
            return (_jsx(RadioGroup, { className: "grid gap-2.5", value: value, "aria-invalid": presentation.showError ? true : undefined, onFocus: handlers.onFocus, onValueChange: (nextValue) => handlers.onChange(nextValue), onBlur: handlers.onBlur, children: options?.map((option) => (_jsxs("label", { className: "inline-flex items-center gap-2.5", children: [_jsx(RadioGroupItem, { value: option.value, "aria-label": option.label }), _jsx("span", { className: "font-medium", children: option.label })] }, option.value))) }));
        }
    },
    {
        type: 'checkbox-group',
        fields: [formLabelFieldRule],
        validation: createFieldValidation(),
        wrap: true,
        component: function CheckboxGroupRenderer(props) {
            const scope = useRenderScope();
            const currentForm = useCurrentForm();
            const name = String(props.props.name ?? props.schema.name ?? '');
            const rawValue = useBoundFieldValue(name, currentForm);
            const value = Array.isArray(rawValue) ? rawValue : [];
            const options = Array.isArray(props.props.options) ? props.props.options : [];
            const presentation = useFieldPresentation(name, currentForm);
            const handlers = createFieldHandlers({
                name,
                currentForm,
                scope,
                setValue(nextValue) {
                    currentForm?.setValue(name, nextValue);
                }
            });
            return (_jsx("div", { className: "grid gap-2.5", children: options?.map((option) => {
                    const checked = value.some((candidate) => Object.is(candidate, option.value));
                    return (_jsxs("label", { className: "inline-flex items-center gap-2.5", children: [_jsx(Checkbox, { checked: checked, "aria-invalid": presentation.showError ? true : undefined, "aria-label": option.label, onFocus: handlers.onFocus, onCheckedChange: (nextChecked) => {
                                    const checkedValue = Boolean(nextChecked);
                                    const nextValue = checkedValue
                                        ? [...value, option.value]
                                        : value.filter((candidate) => !Object.is(candidate, option.value));
                                    handlers.onChange(nextValue);
                                }, onBlur: handlers.onBlur }), _jsx("span", { className: "font-medium", children: option.label })] }, option.value));
                }) }));
        }
    }
];
