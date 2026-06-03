interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  className?: string;
}

interface ConfirmRequest {
  id: number;
  message: string;
  options: ConfirmOptions;
}

let nextConfirmId = 1;
let currentRequest: ConfirmRequest | null = null;
let currentResolver: ((result: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function clearCurrentRequest(result: boolean) {
  const resolver = currentResolver;
  currentRequest = null;
  currentResolver = null;
  notifyListeners();
  resolver?.(result);
}

export function confirmInApp(message: string, options: ConfirmOptions = {}) {
  if (currentResolver) {
    clearCurrentRequest(false);
  }

  currentRequest = {
    id: nextConfirmId++,
    message,
    options,
  };

  notifyListeners();

  return new Promise<boolean>((resolve) => {
    currentResolver = resolve;
  });
}

export function getConfirmRequest() {
  return currentRequest;
}

export function subscribeConfirm(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function resolveConfirm(result: boolean) {
  if (!currentResolver) {
    return;
  }

  clearCurrentRequest(result);
}
