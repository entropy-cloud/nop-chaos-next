import type { ApiObject, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { InputSchema } from '../schemas';
export declare function createInputRenderer(inputType: string): (props: RendererComponentProps<InputSchema>) => import("react/jsx-runtime").JSX.Element;
export declare function createFieldValidation(nameResolver?: (schema: InputSchema) => string | undefined, email?: boolean): {
    kind: "field";
    valueKind: "scalar";
    getFieldPath(schema: InputSchema): string | undefined;
    collectRules(schema: InputSchema): ({
        kind: "email";
    } | {
        kind: "async";
        api: ApiObject;
        debounce?: number;
        message?: string;
    })[];
};
export declare const inputRendererDefinitions: RendererDefinition[];
