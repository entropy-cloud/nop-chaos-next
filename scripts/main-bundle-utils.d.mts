export interface MainPackageEntry {
  name: string;
}

export interface MainPackageContext {
  rootDir: string;
  resolvePackageEntryByFile(filePath: string): MainPackageEntry | null;
}

export declare const repoRoot: string;

export declare function createMainPackageContext(rootDir?: string): MainPackageContext;

export declare function getMainExternalPackageAliases(rootDir?: string): Array<{
  find: string | RegExp;
  replacement: string;
}>;

export declare function getMainRuntimeOverrideAliases(rootDir?: string): Array<{
  find: string | RegExp;
  replacement: string;
}>;

export declare function getMainChunkGroupName(
  filePath: string,
  context?: MainPackageContext,
): string | undefined;

export declare function getPackageChunkName(packageName: string): string;
