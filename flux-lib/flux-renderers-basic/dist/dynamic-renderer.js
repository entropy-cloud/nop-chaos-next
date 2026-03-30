import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { classNames } from './utils';
export function DynamicRenderer(props) {
    const runtime = useRendererRuntime();
    const env = useRendererEnv();
    const schemaApi = props.props.schemaApi;
    const [state, setState] = useState({
        loading: true,
        error: undefined,
        schema: null
    });
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        const loadSchema = async () => {
            try {
                const evaluatedApi = runtime.evaluate(schemaApi, props.helpers.createScope({}));
                const response = await env.fetcher(evaluatedApi, {
                    scope: props.helpers.createScope({}),
                    env
                });
                if (!mountedRef.current)
                    return;
                setState({ loading: false, error: undefined, schema: response.data });
            }
            catch (err) {
                if (!mountedRef.current)
                    return;
                setState({ loading: false, error: err, schema: null });
            }
        };
        loadSchema();
        return () => {
            mountedRef.current = false;
        };
    }, [schemaApi, runtime, env, props.helpers]);
    if (state.error) {
        return (_jsxs("div", { className: classNames('nop-dynamic-renderer', props.meta.className), "data-error": "", "data-testid": props.meta.testid || undefined, children: ["Error: ", state.error instanceof Error ? state.error.message : String(state.error)] }));
    }
    if (state.schema) {
        return (_jsx("div", { className: classNames('nop-dynamic-renderer', props.meta.className), "data-testid": props.meta.testid || undefined, children: props.helpers.render(state.schema) }));
    }
    return (_jsx("div", { className: classNames('nop-dynamic-renderer', props.meta.className), "data-testid": props.meta.testid || undefined, children: props.regions.body?.render() }));
}
