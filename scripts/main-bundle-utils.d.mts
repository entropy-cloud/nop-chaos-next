export interface MainPackageEntry {
  name: string;
}

export interface MainPackageContext {
  resolvePackageEntryByFile(filePath: string): MainPackageEntry | null;
}

export declare const repoRoot: string;

export declare function createMainPackageContext(rootDir?: string): MainPackageContext;

export declare function getMainExternalPackageAliases(rootDir?: string): Array<{
  find: string;
  replacement: string;
}>;

export declare function getPackageChunkName(packageName: string): string;
