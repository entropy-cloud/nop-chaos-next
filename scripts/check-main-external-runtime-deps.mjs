import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  createMainPackageContext,
  getMainExternalRuntimeDependencyPolicies,
  repoRoot,
  resolvePackageSpecifierFromManifest,
} from './main-bundle-utils.mjs';

function parseArguments(argv) {
  const options = {
    check: false,
    json: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--check') {
      options.check = true;
      continue;
    }

    if (argument === '--json') {
      options.json = argv[index + 1] ?? '';
      index += 1;
    }
  }

  return options;
}

function relativeFromRepo(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function collectReport(context, policies) {
  const mainManifestPath = path.join(repoRoot, 'apps', 'main', 'package.json');
  const mainAppResolutionByPackage = new Map(
    policies.map(({ packageName }) => [packageName, resolvePackageSpecifierFromManifest(mainManifestPath, packageName)]),
  );

  const report = [];

  for (const policy of policies) {
    const mainResolution = mainAppResolutionByPackage.get(policy.packageName) ?? null;
    const resolutions = [];

    if (mainResolution) {
      resolutions.push({ owner: '@nop-chaos/main', resolution: mainResolution });
    }

    for (const externalPackage of context.externalPackages) {
      const externalManifestPath = path.join(externalPackage.directory, 'package.json');
      const externalResolution = resolvePackageSpecifierFromManifest(
        externalManifestPath,
        policy.packageName,
      );

      if (!externalResolution) {
        continue;
      }

      resolutions.push({ owner: externalPackage.name, resolution: externalResolution });
    }

    const uniqueResolutions = new Map();

    for (const entry of resolutions) {
      const owners = uniqueResolutions.get(entry.resolution) ?? [];
      owners.push(entry.owner);
      uniqueResolutions.set(entry.resolution, owners);
    }

    if (resolutions.length === 0) {
      report.push({
        packageName: policy.packageName,
        strategy: policy.strategy,
        status: 'unused',
        resolutions: [],
      });
      continue;
    }

    if (uniqueResolutions.size === 1) {
      report.push({
        packageName: policy.packageName,
        strategy: policy.strategy,
        status: 'matched',
        resolutions: [...uniqueResolutions.entries()].map(([resolution, owners]) => ({
          resolution,
          owners: owners.sort((left, right) => left.localeCompare(right)),
        })),
      });
      continue;
    }

    report.push({
      packageName: policy.packageName,
      strategy: policy.strategy,
      status: policy.strategy === 'bundler-override' ? 'overridden' : 'violation',
      resolutions: [...uniqueResolutions.entries()].map(([resolution, owners]) => ({
        resolution,
        owners: owners.sort((left, right) => left.localeCompare(right)),
      })),
    });
  }

  return report.sort((left, right) => {
    return left.packageName.localeCompare(right.packageName);
  });
}

const options = parseArguments(process.argv.slice(2));
const context = createMainPackageContext(repoRoot);
const policies = getMainExternalRuntimeDependencyPolicies();
const report = collectReport(context, policies);
const violations = report.filter((entry) => entry.status === 'violation');
const overrides = report.filter((entry) => entry.status === 'overridden');
const matched = report.filter((entry) => entry.status === 'matched');
const unused = report.filter((entry) => entry.status === 'unused');

const lines = [];
lines.push('Main external runtime dependency check');
lines.push('');
lines.push(`External file packages: ${context.externalPackages.length === 0 ? 'none' : context.externalPackages.map((entry) => entry.name).join(', ')}`);
lines.push('');
lines.push('Policies');
for (const policy of policies) {
  lines.push(`  ${policy.packageName}: ${policy.strategy}`);
}

lines.push('');
lines.push('Matched');
if (matched.length === 0) {
  lines.push('  none');
} else {
  for (const entry of matched) {
    lines.push(`  ${entry.packageName}`);
    for (const resolution of entry.resolutions) {
      lines.push(`    ${resolution.owners.join(', ')} -> ${relativeFromRepo(resolution.resolution)}`);
    }
  }
}

lines.push('');
lines.push('Overridden By Host Bundler Policy');
if (overrides.length === 0) {
  lines.push('  none');
} else {
  for (const entry of overrides) {
    lines.push(`  ${entry.packageName}`);
    for (const resolution of entry.resolutions) {
      lines.push(`    ${resolution.owners.join(', ')} -> ${path.relative(repoRoot, resolution.resolution).replace(/\\/g, '/')}`);
    }
  }
}

lines.push('');
lines.push('Violations');
if (violations.length === 0) {
  lines.push('  none');
} else {
  for (const entry of violations) {
    lines.push(`  ${entry.packageName}`);
    for (const resolution of entry.resolutions) {
      lines.push(`    ${resolution.owners.join(', ')} -> ${path.relative(repoRoot, resolution.resolution).replace(/\\/g, '/')}`);
    }
  }
}

lines.push('');
lines.push('Unused Policies');
if (unused.length === 0) {
  lines.push('  none');
} else {
  for (const entry of unused) {
    lines.push(`  ${entry.packageName}`);
  }
}

console.log(lines.join('\n'));

if (options.json) {
  fs.writeFileSync(
    options.json,
    JSON.stringify(
      {
        policies,
        report,
      },
      null,
      2,
    ),
  );
}

if (options.check && violations.length > 0) {
  process.exit(1);
}
