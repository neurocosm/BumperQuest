/**
 * Version Management & Cache Busting Utility
 * Supports comparing client version against server /version.json
 * and performing a full cache dump and hard reload.
 */

export const CURRENT_APP_VERSION = 'v1.09272026.1449';

export interface VersionInfo {
  version: string;
  buildTime?: string;
  notes?: string;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  notes?: string;
}

/**
 * Checks for updates by querying /version.json with cache-busting headers
 */
export async function checkForAppUpdate(): Promise<CheckUpdateResult> {
  try {
    const baseUrl = import.meta.env.BASE_URL || './';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const res = await fetch(`${cleanBase}version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
      };
    }

    const data: VersionInfo = await res.json();
    const serverVer = data.version?.trim() || CURRENT_APP_VERSION;
    const hasUpdate = serverVer !== CURRENT_APP_VERSION;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: serverVer,
      notes: data.notes,
    };
  } catch (err) {
    console.warn('Version check error:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
    };
  }
}

/**
 * Completely purges all browser caches, unregisters service workers,
 * clears session state, and hard reloads with cache-busting parameter.
 */
export async function dumpCachesAndReload(): Promise<void> {
  try {
    // 1. Clear CacheStorage (PWA & Service Worker caches)
    if ('caches' in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }

    // 2. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // 3. Clear temporary session cache
    try {
      sessionStorage.clear();
    } catch {
      // Ignore if restricted
    }
  } catch (err) {
    console.warn('Cache purge partial failure:', err);
  }

  // 4. Force hard reload with timestamp cache-buster query
  const targetUrl = new URL(window.location.href);
  targetUrl.searchParams.set('_purge', Date.now().toString());
  window.location.replace(targetUrl.toString());
}
