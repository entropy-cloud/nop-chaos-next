import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldHint, FieldLabel } from './index';
describe('shared form renderer primitives', () => {
    it('renders labels with the expected chrome element', () => {
        render(_jsxs(_Fragment, { children: [_jsx(FieldLabel, { content: "Profile" }), _jsx(FieldLabel, { content: "Settings", as: "legend" })] }));
        expect(screen.getByText('Profile').tagName).toBe('SPAN');
        expect(screen.getByText('Settings').tagName).toBe('LEGEND');
    });
    it('renders validation errors before validating hints', () => {
        const { rerender } = render(_jsx(FieldHint, { errorMessage: "Username is required", showError: true }));
        expect(screen.getByText('Username is required').className).toContain('nop-field__error');
        rerender(_jsx(FieldHint, { validating: true }));
        expect(screen.getByText('Validating...').className).toContain('nop-field__hint');
    });
});
