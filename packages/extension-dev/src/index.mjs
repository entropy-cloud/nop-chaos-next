/**
 * @nop-chaos/extension-dev — programmatic entry.
 *
 * Official dev tooling for building nop-chaos extensions without host
 * source. See the CLI (`nop-extension-dev --help`) or the package README.
 */

export {
  buildExtensionInjectionScript,
  injectExtensionSources,
} from './inject.mjs';

export { startDevInHostProxy } from './proxy.mjs';

export { startStaticServer } from './serve.mjs';

export { buildExtension } from './build.mjs';

export { extensionManifestPlugin } from './manifest-plugin.mjs';

export {
  EXTENSION_SOURCES_GLOBAL,
  HOST_API_VERSION,
  HOST_API_VERSION_GLOBAL,
  NOP_SHARED_REGISTRY_GLOBAL,
  SHARED_MODULE_NAMES,
} from './contract.mjs';