import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { arrayEditorRendererDefinition } from './renderers/array-editor';
import { formRendererDefinition } from './renderers/form';
import { inputRendererDefinitions } from './renderers/input';
import { keyValueRendererDefinition } from './renderers/key-value';
import { tagListRendererDefinition } from './renderers/tag-list';
export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './renderers/array-editor';
export { FormRenderer, formRendererDefinition } from './renderers/form';
export { createFieldValidation, createInputRenderer, inputRendererDefinitions } from './renderers/input';
export { KeyValueRenderer, keyValueRendererDefinition } from './renderers/key-value';
export * from './renderers/shared';
export { TagListRenderer, tagListRendererDefinition } from './renderers/tag-list';
export * from './field-utils';
export * from './schemas';
export const formRendererDefinitions = [
    formRendererDefinition,
    ...inputRendererDefinitions,
    tagListRendererDefinition,
    keyValueRendererDefinition,
    arrayEditorRendererDefinition
];
export function registerFormRenderers(registry) {
    return registerRendererDefinitions(registry, formRendererDefinitions);
}
