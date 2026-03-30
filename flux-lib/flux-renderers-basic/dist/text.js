import { jsx as _jsx } from "react/jsx-runtime";
import { classNames } from './utils';
export function TextRenderer(props) {
    const text = props.props.body ?? props.props.text;
    const tag = props.props.tag === 'span' ||
        props.props.tag === 'p' ||
        props.props.tag === 'h1' ||
        props.props.tag === 'h2' ||
        props.props.tag === 'h3' ||
        props.props.tag === 'h4' ||
        props.props.tag === 'h5' ||
        props.props.tag === 'h6' ||
        props.props.tag === 'label' ||
        props.props.tag === 'div'
        ? props.props.tag
        : 'span';
    const Tag = tag;
    return _jsx(Tag, { className: classNames('nop-text', props.meta.className), "data-testid": props.meta.testid || undefined, children: String(text ?? '') });
}
