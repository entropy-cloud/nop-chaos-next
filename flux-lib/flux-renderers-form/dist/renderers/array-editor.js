import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { Button, Input } from '@nop-chaos/ui';
import { formLabelFieldRule, getChildFieldUiState, getFieldValidationBehavior, readFieldValue, resolveFieldLabelContent, shouldValidateOn, useCompositeChildFieldState, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
function ArrayEditorRow(props) {
    const { item, index, name, currentForm, childBehavior, onSync, items, itemsRef, itemLabel } = props;
    const itemPath = `${name}.${index}.value`;
    const itemFieldState = useCompositeChildFieldState(itemPath);
    const itemUi = getChildFieldUiState({
        behavior: childBehavior,
        fieldState: itemFieldState
    });
    return (_jsxs("div", { className: "grid grid-cols-[1fr_auto] gap-2.5 items-start", children: [_jsxs("div", { className: itemUi.className, "data-child-field-visited": itemUi['data-child-field-visited'], "data-child-field-touched": itemUi['data-child-field-touched'], "data-child-field-dirty": itemUi['data-child-field-dirty'], "data-child-field-invalid": itemUi['data-child-field-invalid'], children: [_jsx(Input, { type: "text", value: item.value, placeholder: itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`, "aria-invalid": itemUi.showError ? true : undefined, onFocus: () => {
                            if (currentForm && name) {
                                currentForm.visitField(name);
                                currentForm.visitField(itemPath);
                            }
                        }, onChange: (event) => {
                            const nextItems = items.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, value: event.target.value } : candidate);
                            onSync(nextItems);
                            if (currentForm) {
                                currentForm.touchField(itemPath);
                                currentForm.setValue(itemPath, event.target.value);
                                if (shouldValidateOn(name, currentForm, 'change')) {
                                    void currentForm.validateField(itemPath);
                                }
                            }
                        }, onBlur: () => {
                            if (currentForm) {
                                currentForm.touchField(itemPath);
                                if (shouldValidateOn(name, currentForm, 'blur')) {
                                    void currentForm.validateField(itemPath);
                                }
                            }
                        } }), _jsx(FieldHint, { errorMessage: itemUi.error?.message, showError: itemUi.showError })] }), _jsx(Button, { type: "button", variant: "destructive", size: "sm", onClick: () => {
                    const nextItems = items.filter((candidate) => candidate.id !== item.id);
                    itemsRef.current = nextItems;
                    if (currentForm && name) {
                        onSync(nextItems);
                        currentForm.removeValue(name, index);
                        void currentForm.validateSubtree(name);
                        return;
                    }
                    onSync(nextItems);
                }, children: "Remove" })] }));
}
function toArrayEditorItems(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((item, index) => {
        const candidate = item && typeof item === 'object' ? item : {};
        return {
            id: typeof candidate.id === 'string' ? candidate.id : `item-${index}`,
            value: typeof candidate.value === 'string' ? candidate.value : typeof item === 'string' ? item : ''
        };
    });
}
function arrayItemsEqual(a, b) {
    if (a === b)
        return true;
    if (a.length !== b.length)
        return false;
    return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
}
export function ArrayEditorRenderer(props) {
    const scope = useRenderScope();
    const currentForm = useCurrentForm();
    const name = String(props.props.name ?? props.schema.name ?? '');
    const presentation = useFieldPresentation(name, currentForm);
    const labelContent = resolveFieldLabelContent(props);
    const childBehavior = getFieldValidationBehavior(name, currentForm);
    const [items, setItems] = React.useState(() => toArrayEditorItems(readFieldValue(scope, name)));
    const itemsRef = React.useRef(items);
    const registrationRef = React.useRef(undefined);
    const childPaths = React.useMemo(() => items.map((_, index) => `${name}.${index}.value`), [items, name]);
    if (registrationRef.current) {
        registrationRef.current.childPaths = childPaths;
    }
    React.useEffect(() => {
        itemsRef.current = items;
    }, [items]);
    const formExternalValue = useCurrentFormState((state) => (currentForm && name ? toArrayEditorItems(getIn(state.values, name)) : undefined), (a, b) => {
        if (a === b)
            return true;
        if (!a || !b || a.length !== b.length)
            return false;
        return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    });
    const scopeExternalValue = useScopeSelector((scopeData) => (currentForm || !name ? undefined : toArrayEditorItems(getIn(scopeData, name))), (a, b) => {
        if (a === b)
            return true;
        if (!a || !b || a.length !== b.length)
            return false;
        return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    });
    const externalValue = currentForm ? formExternalValue : scopeExternalValue;
    React.useEffect(() => {
        if (externalValue !== undefined && !arrayItemsEqual(externalValue, itemsRef.current)) {
            itemsRef.current = externalValue;
            setItems(externalValue);
        }
    }, [externalValue]);
    const syncItems = React.useCallback((nextItems) => {
        itemsRef.current = nextItems;
        setItems(nextItems);
        if (!currentForm || !name) {
            scope.update(name, nextItems);
            return;
        }
        if (!currentForm.isTouched(name)) {
            currentForm.touchField(name);
        }
        currentForm.setValue(name, nextItems);
        void currentForm.validateField(name);
    }, [currentForm, name, scope]);
    React.useEffect(() => {
        if (!currentForm || !name) {
            return;
        }
        const registration = {
            path: name,
            childPaths,
            getValue() {
                return itemsRef.current;
            },
            syncValue() {
                return itemsRef.current;
            },
            validateChild(path) {
                const relativePath = path.startsWith(`${name}.`) ? path.slice(name.length + 1) : path;
                const match = relativePath.match(/^(\d+)\.value$/);
                if (!match) {
                    return [];
                }
                const item = itemsRef.current[Number(match[1])];
                if (!item || item.value.trim() !== '') {
                    return [];
                }
                return [
                    {
                        path,
                        rule: 'required',
                        message: `${props.props.itemLabel ?? 'Item'} ${Number(match[1]) + 1} is required`
                    }
                ];
            }
        };
        registrationRef.current = registration;
        return currentForm.registerField(registration);
    }, [childPaths, currentForm, name, props.props.itemLabel]);
    return (_jsxs("label", { className: presentation.className, "data-field-visited": presentation['data-field-visited'], "data-field-touched": presentation['data-field-touched'], "data-field-dirty": presentation['data-field-dirty'], "data-field-invalid": presentation['data-field-invalid'], children: [_jsx(FieldLabel, { content: labelContent }), _jsxs("div", { className: "grid gap-3", children: [items.map((item, index) => {
                        return (_jsx(ArrayEditorRow, { item: item, index: index, name: name, currentForm: currentForm, childBehavior: childBehavior, onSync: syncItems, items: items, itemsRef: itemsRef, itemLabel: props.props.itemLabel ? String(props.props.itemLabel) : undefined }, item.id));
                    }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => {
                            const nextItem = { id: `item-${items.length + 1}`, value: '' };
                            const nextItems = [...items, nextItem];
                            itemsRef.current = nextItems;
                            if (currentForm && name) {
                                setItems(nextItems);
                                currentForm.appendValue(name, nextItem);
                                void currentForm.validateField(name);
                                return;
                            }
                            syncItems(nextItems);
                        }, children: "Add item" })] }), _jsx(FieldHint, { errorMessage: presentation.fieldState.error?.message, validating: presentation.fieldState.validating, showError: presentation.showError })] }));
}
export const arrayEditorRendererDefinition = {
    type: 'array-editor',
    component: ArrayEditorRenderer,
    fields: [formLabelFieldRule],
    validation: {
        kind: 'field',
        valueKind: 'array',
        getFieldPath(schema) {
            return typeof schema.name === 'string' ? schema.name : undefined;
        },
        collectRules(schema) {
            return [{ kind: 'minItems', value: 1, message: `${schema.label ?? schema.name ?? 'Field'} requires at least one item` }];
        }
    }
};
