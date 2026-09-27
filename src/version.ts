/**
 * SINGLE SOURCE OF TRUTH FOR APPLICATION VERSIONING
 * 
 * Version Format: v1.MMDDYYYY.HHMM (Eastern Time: EDT during Daylight Saving, EST during Standard Time)
 * 
 * To ensure consistency across all components, modals, HUDs, and network checks,
 * ALL files must import APP_VERSION and related metadata strictly from this single file.
 */

export interface AppVersionMetadata {
  version: string;
  buildTime: string;
  timeZone: 'EDT' | 'EST' | string;
  notes: string;
  author: string;
  authorUrl: string;
}

export const APP_VERSION_DATA: AppVersionMetadata = {
  version: 'v1.09272026.1825',
  buildTime: '2026-09-27T18:25:00-04:00', // Eastern Time (EDT: UTC-4, EST: UTC-5)
  timeZone: 'EDT',
  notes: 'Transformed the corner gadgets into physical flipper triggers for mobile & touch play: Top-Left Rotary Saw triggers TL flipper, Top-Right Ball Trapper triggers TR flipper, and the Bottom Corner Spiked Pinwheels trigger the BL and BR flippers.',
  author: 'BostonyFX',
  authorUrl: 'https://www.instagram.com/tony_bostony/',
};

// Primary version string exported for all components
export const CURRENT_APP_VERSION = APP_VERSION_DATA.version;

/**
 * Utility to generate or format a version timestamp string in Eastern Time (America/New_York),
 * automatically adjusting for Daylight Saving Time (EDT vs EST).
 */
export function formatEasternVersion(date: Date = new Date()): { version: string; timeZone: string; buildTime: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );

  const version = `v1.${parts.month}${parts.day}${parts.year}.${parts.hour}${parts.minute}`;
  return {
    version,
    timeZone: parts.timeZoneName || 'ET',
    buildTime: date.toISOString(),
  };
}
