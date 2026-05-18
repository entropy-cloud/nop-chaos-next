const DEFAULT_HOME_PATH = '/dashboard';

let currentHomePath = DEFAULT_HOME_PATH;

function normalizeHomePath(path?: string) {
  if (!path || !path.startsWith('/')) {
    return DEFAULT_HOME_PATH;
  }

  return path;
}

export function getDefaultHomePath() {
  return DEFAULT_HOME_PATH;
}

export function getCurrentHomePath() {
  return currentHomePath;
}

export function setCurrentHomePath(path?: string) {
  currentHomePath = normalizeHomePath(path);
}

export function resetCurrentHomePath() {
  currentHomePath = DEFAULT_HOME_PATH;
}
