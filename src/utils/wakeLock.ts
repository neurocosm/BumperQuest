/**
 * Screen Wake Lock Manager
 * Prevents screens/monitors/mobile devices from dimming or going to sleep
 * while BumperQuest is playing or running in screensaver / autonomous arcade mode.
 * 
 * Uses the modern standard navigator.wakeLock API with automatic re-acquisition
 * on visibilitychange (e.g. when user tabs back or unlocks their screen).
 */

class ScreenWakeLockManager {
  private wakeLock: WakeLockSentinel | null = null;
  private isEnabled: boolean = true;
  private isSupported: boolean = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public init(enabledByDefault: boolean = true) {
    this.isEnabled = enabledByDefault;
    if (this.isEnabled) {
      this.requestLock();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.requestLock();
    } else {
      this.releaseLock();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getIsActive(): boolean {
    return !!this.wakeLock && !this.wakeLock.released;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public async requestLock(): Promise<boolean> {
    if (!this.isSupported || !this.isEnabled) return false;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return false;
    }

    try {
      if (this.wakeLock && !this.wakeLock.released) {
        return true;
      }

      this.wakeLock = await navigator.wakeLock.request('screen');

      this.wakeLock.addEventListener('release', () => {
        // If released by the system (e.g. battery saver or temporary backgrounding)
        // and we still want to keep screen awake, re-request once visible
        if (this.isEnabled && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.scheduleRetry();
        }
      });

      return true;
    } catch (err) {
      // Common reasons: user denied permission, low battery mode, or non-active tab
      return false;
    }
  }

  public async releaseLock() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {
        // Ignore
      }
      this.wakeLock = null;
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.isEnabled) {
      this.requestLock();
    }
  };

  private scheduleRetry() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      if (this.isEnabled && document.visibilityState === 'visible') {
        this.requestLock();
      }
    }, 1500);
  }
}

export const screenWakeLock = new ScreenWakeLockManager();
