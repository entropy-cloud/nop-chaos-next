import { installNopDebuggerWindowFlag } from './automation';
import type { NopDebuggerAutomationApi, NopDebuggerController, NopDebuggerOptions, NopDiagnosticReport, NopDiagnosticReportOptions } from './types';
export declare function createNopDebugger(options?: NopDebuggerOptions): NopDebuggerController;
export declare function getNopDebuggerAutomationApi(controllerId?: string): NopDebuggerAutomationApi | undefined;
export { installNopDebuggerWindowFlag };
export declare function createNopDiagnosticReport(controller: NopDebuggerController, options?: NopDiagnosticReportOptions): NopDiagnosticReport;
