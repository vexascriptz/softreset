export type DeviceType = 'desktop' | 'laptop';
export type DriveType = 'ssd' | 'hdd' | 'unknown';
export type PrimaryUse = 'office' | 'gaming' | 'mixed';

export interface SettingContext {
  device: DeviceType;
  drive: DriveType;
  use: PrimaryUse;
}

export interface SettingRecommendation {
  value: string;
  reason: string;
}

export interface WindowsSettingGuide {
  id: string;
  title: string;
  location: string;
  purpose: string;
  defaultBehavior: string;
  whenToChange: string;
  recommend: (ctx: SettingContext) => SettingRecommendation;
  disadvantages: string[];
  revert: string;
  relatedProblemIds: string[];
}

export const WINDOWS_SETTINGS: WindowsSettingGuide[] = [
  {
    id: 'storage-sense',
    title: 'Storage Sense',
    location: 'Settings > System > Storage > Storage Sense',
    purpose: 'Runs automatic cleanup of temporary files and Recycle Bin items on a schedule or when the drive runs low.',
    defaultBehavior: 'Off on most installations. Option names and defaults differ between Windows versions; check the page on the machine.',
    whenToChange: 'When the customer has low free space and needs routine cleanup without reviewing it each time.',
    recommend: () => ({
      value: 'On. Delete temporary files: on. Recycle Bin: after 30 days. Downloads: Never. Previous Windows versions: off.',
      reason:
        'This is the safest set of automatic deletions. The values do not change with device or workload, because the risk is in what gets deleted, not in the hardware.',
    }),
    disadvantages: ['Recycle Bin items are removed on schedule, so the customer loses the chance to restore them.', 'Previous-version cleanup removes the rollback path.'],
    revert: 'Turn Storage Sense off on the same page. Files already removed cannot be restored by this setting.',
    relatedProblemIds: ['low-disk-space'],
  },
  {
    id: 'startup-apps',
    title: 'Startup apps',
    location: 'Task Manager > Startup apps (or Settings > Apps > Startup)',
    purpose: 'Controls which programs start when the customer signs in.',
    defaultBehavior: 'Each program sets its own default. Many install with startup enabled, even if the customer never uses them.',
    whenToChange: 'When sign-in is slow and the enabled count is high, and the customer confirms which programs they do not need.',
    recommend: (ctx) => ({
      value:
        ctx.drive === 'hdd'
          ? 'Keep security software, drivers the customer relies on, and the programs they use every day. Disable updaters and helpers they do not need. On a hard drive, startup load has a larger effect, so this matters more.'
          : 'Keep security software, drivers the customer relies on, and daily-use programs. Disable updaters and helpers they do not need.',
      reason:
        ctx.drive === 'hdd'
          ? 'Startup items compete for a slower disk at sign-in, so each unnecessary item costs more time.'
          : 'Startup items still compete for CPU and disk after sign-in, though the effect on an SSD is smaller.',
    }),
    disadvantages: ['A disabled program may need to be started by hand.', 'Some tools (for example, audio or GPU control software) lose their tray icon or background features when disabled.'],
    revert: 'Enable the item again in Task Manager > Startup apps, or tick its checkbox in Autoruns.',
    relatedProblemIds: ['slow-startup', 'background-processes'],
  },
  {
    id: 'power-mode',
    title: 'Power mode',
    location: 'Settings > System > Power & battery > Power mode',
    purpose: 'Sets how aggressively Windows trades power and heat for performance.',
    defaultBehavior: 'Usually Balanced. Laptops may switch modes automatically when on battery. Confirm the setting on the machine.',
    whenToChange: 'When a measurement shows the processor or GPU is held back by power or heat, not by the workload.',
    recommend: (ctx) => {
      if (ctx.device === 'laptop') {
        return {
          value: 'Balanced on battery. Best performance only when plugged in and the cooling is measured to hold.',
          reason:
            'Best performance on battery drains the charge faster and raises temperatures. Plugged in, it can help if clock speeds are power-limited, but only test-confirm it.',
        };
      }
      if (ctx.use === 'gaming') {
        return {
          value: 'Balanced by default. Test Best performance with a frame capture, and keep it only if clocks and temperatures stay acceptable.',
          reason:
            'Best performance can raise sustained clocks. It also raises heat and fan noise, so the capture decides it.',
        };
      }
      return {
        value: 'Balanced.',
        reason: 'Balanced fits office and mixed use. Best performance adds heat and noise with little effect on everyday work.',
      };
    },
    disadvantages: ['Best performance increases heat, fan noise, and power use.', 'On laptops, it drains battery faster.'],
    revert: 'Return Power mode to Balanced on the same page.',
    relatedProblemIds: ['thermal-throttling', 'gaming-low-fps'],
  },
  {
    id: 'game-mode',
    title: 'Game Mode',
    location: 'Settings > Gaming > Game mode',
    purpose: 'Asks Windows to prioritize the game and limit some background work while it runs.',
    defaultBehavior: 'On in recent Windows builds on most systems. Confirm on the machine.',
    whenToChange: 'For gaming use, leave it on. Turn it off only if a capture shows it makes the result worse on this machine.',
    recommend: (ctx) => ({
      value: ctx.use === 'office' ? 'Off or on. It has little effect on office work.' : 'On. Confirm with a before and after capture.',
      reason:
        'Game Mode can help a game get more consistent time from the processor. It does not guarantee a higher frame rate, and its effect varies by system.',
    }),
    disadvantages: ['Its effect is small or absent on some systems.', 'It limits some background activity, which can matter for other software the customer uses while gaming.'],
    revert: 'Turn Game mode off on the same page.',
    relatedProblemIds: ['gaming-low-fps', 'inconsistent-performance'],
  },
  {
    id: 'virtual-memory',
    title: 'Virtual memory (paging file)',
    location: 'System > Advanced system settings > Performance > Settings > Advanced > Virtual memory',
    purpose: 'Sets the disk space Windows uses to extend memory when RAM is full.',
    defaultBehavior: 'Managed by the system by default. Changing it is rarely needed.',
    whenToChange: 'Only when peak memory measurements show paging is the real limit, and the customer’s disk has room for a larger file.',
    recommend: () => ({
      value: 'System managed. Do not change it unless a measured problem points to the paging file.',
      reason:
        'Manual sizes can make paging worse, and a fixed size is a guess about future workloads. A measured memory pressure problem is a reason to look at capacity and programs first.',
    }),
    disadvantages: ['A poorly chosen size can cause crashes or slow paging.', 'Disabling the paging file can make some programs fail.'],
    revert: 'Set the paging file back to System managed on the same page.',
    relatedProblemIds: ['high-ram', 'memory-instability'],
  },
];

export const WINDOWS_SETTING_BY_ID = Object.fromEntries(WINDOWS_SETTINGS.map((s) => [s.id, s])) as Record<string, WindowsSettingGuide>;
