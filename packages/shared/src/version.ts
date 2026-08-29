/**
 * Host/extension API version contract.
 *
 * `HOST_API_VERSION` identifies the shape of the host integration surface that
 * extensions are compiled against (ShellExtension contract, shared modules,
 * bootstrap semantics). Every host build embeds this value at runtime
 * (`window.__NOP_HOST_API_VERSION__`) so extensions (declaring
 * `ShellExtension.minHostApiVersion`) and tooling can detect version drift.
 *
 * Bump policy:
 * - MAJOR: breaking change to the extension contract (fields removed/renamed,
 *   loading semantics changed).
 * - MINOR: additive, backward-compatible extension of the contract.
 * - PATCH: internal fixes that do not change the contract surface.
 */
export const HOST_API_VERSION = '0.2.0';

const API_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isApiVersion(value: string): boolean {
  return API_VERSION_PATTERN.test(value);
}

function parseApiVersion(value: string): number[] {
  return value.split('.').map((part) => Number.parseInt(part, 10));
}

/**
 * Compare two `x.y.z` API versions.
 *
 * @returns negative when a < b, 0 when equal, positive when a > b.
 */
export function compareApiVersions(a: string, b: string): number {
  const pa = parseApiVersion(a);
  const pb = parseApiVersion(b);
  const length = Math.max(pa.length, pb.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

/**
 * Whether the host API version `hostVersion` satisfies an extension's
 * `minHostApiVersion` requirement.
 */
export function satisfiesMinApiVersion(hostVersion: string, minVersion: string): boolean {
  return compareApiVersions(hostVersion, minVersion) >= 0;
}