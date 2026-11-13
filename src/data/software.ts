// Software entries. Fields marked "unverified" in each entry were not confirmed against the vendor in this build.
// Pending entries are listed by name only. They are not described until they are written.

export type SoftwareCategory = 'Cleanup and storage' | 'Diagnostics and performance' | 'Built into Windows';

export interface SoftwareEntry {
  id: string;
  name: string;
  category: SoftwareCategory;
  purpose: string;
  website: string;
  downloadSource: string;
  license: string;
  commercialUse: 'free' | 'restricted' | 'check';
  licenseSources: string[];
  windows: string;
  whenToUse: string[];
  whenNotToUse: string[];
  install: string[];
  recommendedConfig: string[];
  usage: string[];
  metrics: { name: string; meaning: string }[];
  mistakes: string[];
  safety: string[];
  relatedProblems: string[];
  alternatives: string[];
  verification: string[];
  unverified: string[];
  procedureIds: string[];
}

export const SOFTWARE: SoftwareEntry[] = [
  {
    id: 'task-manager',
    name: 'Task Manager',
    category: 'Built into Windows',
    purpose: 'Shows running processes, resource use, and the startup list. It is the first measurement tool for most performance complaints.',
    website: 'Built into Windows. Open with Ctrl+Shift+Esc.',
    downloadSource: 'Not applicable. Included with Windows.',
    license: 'Part of Windows. No separate license.',
    commercialUse: 'free',
    licenseSources: [],
    windows: 'Windows 10 and 11. Tab names and menus change between builds.',
    whenToUse: [
      'Measuring CPU, memory, and disk use at idle and under load.',
      'Finding which process holds a resource for a sustained period.',
      'Reviewing the startup list before changing anything.',
    ],
    whenNotToUse: ['Measuring frame times in games. Use a frame-capture tool.', 'Judging drive health. Use CrystalDiskInfo.'],
    install: ['Nothing to install. Press Ctrl+Shift+Esc, or right-click the taskbar and choose Task Manager.', 'If it opens in compact form, select More details.'],
    recommendedConfig: [
      'Performance tab: read the values, not only the graph shape.',
      'Processes tab: sort by CPU first, then by Memory and Disk.',
    ],
    usage: [
      'Idle baseline: leave the machine alone for two minutes, then read CPU, Memory, and Disk on the Performance tab.',
      'Under load: recreate the complaint, then sort Processes by the resource in question and note the top five.',
      'Startup: open Startup apps and count rows with status Enabled.',
    ],
    metrics: [
      { name: 'CPU %', meaning: 'Share of total processor capacity in use. One saturated core can look modest in the total.' },
      { name: 'Memory "In use"', meaning: 'Memory held by running programs. Cached memory is shown separately, and a full cache is normal.' },
      { name: 'Disk active time %', meaning: 'How often the drive is busy. Sustained high values at idle usually mean background work.' },
      { name: 'Startup impact', meaning: 'Windows’ estimate of how much an item slows sign-in. It is an estimate, not a measurement.' },
    ],
    mistakes: [
      'Treating one snapshot as the baseline. Use at least two minutes at idle.',
      'Reading high memory use as a fault. Windows uses free memory for caching by design.',
      'Ending processes you do not recognize. Look them up first, because some are required services.',
    ],
    safety: ['Ending a process can lose unsaved work. Ask the customer first.', 'Do not disable services from Task Manager during a diagnosis.'],
    relatedProblems: ['general-slowdown', 'slow-startup', 'high-cpu', 'high-ram', 'high-disk-activity', 'background-processes'],
    alternatives: ['resource-monitor'],
    verification: ['Repeat the same idle and load readings under the same conditions after a change.', 'Confirm the startup count matches the change you made.'],
    unverified: ['Menu names and the Update speed option vary by Windows build. Check them on the machine.'],
    procedureIds: ['task-manager-baseline', 'startup-review'],
  },
  {
    id: 'wiztree',
    name: 'WizTree',
    category: 'Cleanup and storage',
    purpose: 'Scans a drive and shows which folders and files use the most space, as a sorted list and as a treemap.',
    website: 'https://diskanalyzer.com/',
    downloadSource: 'Download from diskanalyzer.com only. Avoid bundled installers and third-party mirrors.',
    license:
      'Free for personal use only. The vendor’s EULA says commercial use requires a supporter code for each business site, or an enterprise license.',
    commercialUse: 'restricted',
    licenseSources: ['https://diskanalyzer.com/eula'],
    windows: 'Windows. Fastest on NTFS drives. Sources differ on non-NTFS support, so verify on the machine before relying on it.',
    whenToUse: ['Finding the largest folders and files on a nearly full drive.', 'Confirming which program or data set owns the space.'],
    whenNotToUse: ['Finding duplicate files. Use a duplicate finder.', 'Deleting anything that has not been classified with the customer.'],
    install: [
      'Download the current installer or portable build from the vendor site.',
      'Run it as administrator for full-speed scans of NTFS drives. A third-party guide recommends this; confirm with the vendor.',
    ],
    recommendedConfig: ['Scan the whole system drive once, then scan again after cleanup to compare.', 'Sort by size, largest first.'],
    usage: [
      'Select the drive, scan it, and sort by Size.',
      'Expand the top five folders and note their names and sizes.',
      'Classify each folder before any action: application, user data, cache, Windows, or unknown.',
    ],
    metrics: [
      { name: 'Size', meaning: 'Space the item occupies on disk, including cluster rounding. This can differ slightly from the file’s apparent size.' },
      { name: 'Files and folders', meaning: 'Counts inside each folder. A folder with many small files can be slow to clean by hand.' },
    ],
    mistakes: [
      'Deleting from WizTree without classification.',
      'Assuming a large folder is junk. Game, project, and virtual machine folders are often large and necessary.',
      'Comparing a scan of one drive with a scan of another.',
    ],
    safety: [
      'Do not delete from Windows, Program Files, or folders you cannot name.',
      'Before deleting user data, confirm the customer has a backup or has agreed to the deletion.',
    ],
    relatedProblems: ['low-disk-space', 'unexplained-storage-usage', 'unnecessary-applications', 'file-organization'],
    alternatives: ['treesize-free', 'storage-sense'],
    verification: ['Rescan after cleanup and compare used and free space.', 'Check free space in File Explorer as well. The two should agree within normal variation.'],
    unverified: [
      'Non-NTFS support differs between sources.',
      'License tier prices change. Check the vendor page before buying.',
      'Whether a delete action in WizTree bypasses the Recycle Bin. Check before using it.',
    ],
    procedureIds: ['disk-space-recovery'],
  },
  {
    id: 'autoruns',
    name: 'Autoruns',
    category: 'Diagnostics and performance',
    purpose:
      'Lists every program and service set to start automatically, including Run keys, scheduled tasks, services, and drivers. Shows the publisher and the file path for each entry.',
    website: 'https://learn.microsoft.com/sysinternals/downloads/autoruns',
    downloadSource: 'Microsoft Sysinternals, from learn.microsoft.com. Use Microsoft’s zip, not third-party copies.',
    license: 'Microsoft Sysinternals freeware. Read the Sysinternals license terms on the download page before commercial use.',
    commercialUse: 'check',
    licenseSources: ['https://learn.microsoft.com/sysinternals/downloads/autoruns'],
    windows: 'Windows. Run as administrator to see and change every entry.',
    whenToUse: [
      'Startup or background load is suspected, and Task Manager’s list does not name the entries.',
      'You need to see scheduled tasks and services that start with Windows.',
      'You need the file path and publisher for a startup item.',
    ],
    whenNotToUse: ['Simple cases where Task Manager’s Startup apps already gives the answer.', 'Changing security software or driver entries without a documented reason.'],
    install: [
      'Download the zip from Microsoft and extract it to its own folder.',
      'Right-click autoruns64.exe (or autoruns.exe on 32-bit systems) and choose Run as administrator.',
    ],
    recommendedConfig: [
      'Options: hide Microsoft entries while reviewing third-party items. Turn it off when auditing Windows components.',
      'Options: enable code signature verification to flag unsigned or altered files.',
      'Leave VirusTotal checking off unless the customer agrees. It sends file hashes to a third party.',
    ],
    usage: [
      'Start on the Logon tab for user startup items. Review Services and Scheduled Tasks as needed.',
      'For each third-party entry, note the publisher, the path, and whether the customer recognizes it.',
      'To disable an entry, clear its checkbox. To re-enable it, tick the box again.',
    ],
    metrics: [
      { name: 'Publisher', meaning: 'The company in the file’s version information. A blank or unexpected publisher needs a closer look.' },
      { name: 'Image path', meaning: 'The file that runs. Files in temporary folders or in a user profile’s temp locations warrant attention.' },
    ],
    mistakes: [
      'Disabling an entry whose purpose has not been established.',
      'Deleting entries instead of unchecking them. Deleting removes the easy way back.',
      'Treating every third-party entry as bloat. Audio drivers, GPU control panels, and security tools are often wanted.',
    ],
    safety: [
      'Do not disable entries for security software, drivers, or hardware control software without the customer’s approval.',
      'Save the current state before making changes, so you can compare it afterwards.',
    ],
    relatedProblems: ['slow-startup', 'general-slowdown', 'background-processes'],
    alternatives: ['task-manager'],
    verification: ['Re-measure sign-in time and the startup count in Task Manager.', 'Confirm the customer’s programs start and work as expected after the next sign-in.'],
    unverified: [
      'Menu item names and default settings may differ by Autoruns version. The option names in this entry were not checked against the current release.',
      'Commercial-use terms. Check the Sysinternals license page.',
    ],
    procedureIds: ['startup-review'],
  },
  {
    id: 'crystaldiskinfo',
    name: 'CrystalDiskInfo',
    category: 'Diagnostics and performance',
    purpose: 'Reads SMART data from SATA, NVMe, and USB drives, and reports a health status with attribute values and temperature.',
    website: 'https://crystalmark.info/en/software/crystaldiskinfo/',
    downloadSource: 'The official site. Use the official installer or ZIP. The publisher is Crystal Dew World.',
    license: 'Free and open source under the MIT License. Commercial use is permitted when the license notice is kept.',
    commercialUse: 'free',
    licenseSources: ['https://www.openhub.net/p/CrystalDiskInfo'],
    windows: 'Windows. The official site lists Windows XP through 11. The ZIP version runs without installation.',
    whenToUse: [
      'Storage health is in doubt, or before and after a drive-related fix.',
      'A drive shows slow access, errors, or intermittent disappearance.',
      'Recording a baseline of drive health for a report.',
    ],
    whenNotToUse: ['Measuring speed. Use CrystalDiskMark, which is a separate tool.', 'Confirming a drive is safe. A Good status does not rule out failure.'],
    install: [
      'Use the ZIP for a portable run from a folder you control, or the installer for a permanent setup.',
      'Prefer a folder you can delete later if the customer does not want it installed.',
    ],
    recommendedConfig: [
      'Leave background monitoring and alerts off unless the customer asks for them.',
      'Record the software version in the report. Release notes for version 9.9.2 describe fixing a bug that labeled some genuine Samsung SSDs as fake. If you see a fake label, check your version first.',
    ],
    usage: [
      'Select the drive from the Disk menu and read the Health Status: Good, Caution, or Bad.',
      'Read Temperature and the attribute table. For SATA drives, note Reallocated Sectors Count, Current Pending Sector Count, and Uncorrectable Sector Count.',
      'For NVMe drives, note Available Spare, Percentage Used, and Media and Data Integrity Errors. Confirm the labels on the drive in front of you.',
    ],
    metrics: [
      { name: 'Health status', meaning: 'The tool’s overall judgment from the SMART attributes. Caution means act soon. Bad means stop and back up.' },
      { name: 'Reallocated Sectors Count', meaning: 'Sectors the drive has moved to spare areas. A rising count is a warning sign.' },
      { name: 'Current Pending Sector Count', meaning: 'Sectors waiting for a decision after read problems. Any non-zero value needs attention.' },
    ],
    mistakes: [
      'Treating Good as proof of health.',
      'Changing advanced options in the Function menu, such as acoustic or power management, without knowing how to revert them.',
      'Reading one value as a trend. Record the value and the date every time.',
    ],
    safety: [
      'If the status is Caution or Bad, back up the customer’s data before running any repair or optimization.',
      'Do not run repair tools on a failing drive as a first step.',
    ],
    relatedProblems: ['suspected-drive-failure', 'slow-storage', 'missing-drive', 'slow-startup'],
    alternatives: ['hwinfo64'],
    verification: ['Repeat the reading after any drive change, and compare the attribute values with the earlier record.'],
    unverified: ['Attribute labels vary between NVMe drives and USB bridges. Read the labels on the screen rather than relying on this entry.'],
    procedureIds: ['disk-health-check'],
  },
  {
    id: 'hwinfo64',
    name: 'HWiNFO64',
    category: 'Diagnostics and performance',
    purpose: 'Full hardware inventory and live sensor monitoring: temperatures, clock speeds, power, utilization, and fan speeds.',
    website: 'https://www.hwinfo.com/',
    downloadSource: 'hwinfo.com only. Ignore download sites that bundle installers.',
    license:
      'The free HWiNFO64 build is for non-commercial use. Commercial use requires HWiNFO64 Pro with an Engineer or Corporate license. The EULA allows a 14-day commercial evaluation with the free build.',
    commercialUse: 'restricted',
    licenseSources: ['https://www.hwinfo.com/files/license.pdf', 'https://hwinfo.com/?p=901'],
    windows: 'Windows, 64-bit build for this entry.',
    whenToUse: ['Checking temperatures, clock speeds, and power limits during a load test.', 'Identifying the hardware model or BIOS version for the report.', 'Logging sensors during a gaming capture.'],
    whenNotToUse: ['Frame-time measurement. Use CapFrameX or PresentMon.', 'Drive health alone. CrystalDiskInfo is more direct.'],
    install: ['Download the 64-bit build from hwinfo.com.', 'At launch, choose the Sensors-only option when you only need live readings.'],
    recommendedConfig: [
      'Sensors window: show the Minimum, Maximum, and Average columns, so one run records the peaks.',
      'If you need a record, use the logging option to write sensor values to a CSV file for the capture period.',
    ],
    usage: [
      'Start in Sensors-only mode and open the sensor window.',
      'Start the workload, and note the Average and Maximum values for CPU temperature and clock, CPU package power, GPU core clock, GPU temperature, and GPU utilization.',
      'Stop the load. Note whether clocks fell while temperatures were high. That is throttling.',
    ],
    metrics: [
      { name: 'Average and Maximum columns', meaning: 'Values over the monitoring interval. Use Maximum for temperatures and Average for sustained load.' },
      { name: 'Clock speed under load', meaning: 'A clock that falls while temperature rises suggests thermal or power throttling.' },
    ],
    mistakes: [
      'Reading a temperature without the load it was taken under.',
      'Treating a high temperature alone as a fault. Many processors run close to their limits by design.',
      'Leaving the sensor window open in the background during tests, which adds its own load.',
    ],
    safety: [
      'Do not change fan curves or voltages from HWiNFO during a diagnosis. Record only.',
      'Stop the test and report if temperatures reach levels the component vendor lists as unsafe.',
    ],
    relatedProblems: ['thermal-throttling', 'cpu-bottleneck', 'stuttering', 'gpu-underutilization', 'high-cpu'],
    alternatives: ['task-manager'],
    verification: ['Repeat the same load under similar ambient conditions and compare clocks and temperatures.'],
    unverified: [
      'Sources describe the free build’s sensor time limits differently. Check how the current version behaves.',
      'Logging options and column names vary by version.',
    ],
    procedureIds: ['gaming-frame-capture'],
  },
  {
    id: 'capframex',
    name: 'CapFrameX',
    category: 'Diagnostics and performance',
    purpose: 'Captures and analyzes frame timing for games and applications: average frame rate, percentile lows, and frame-time graphs.',
    website: 'Project page on GitHub (CXWorld/CapFrameX). Verify the address before downloading.',
    downloadSource: 'The project’s GitHub releases page. Check the publisher and any published checksum.',
    license: 'Not verified in this build. Check the LICENSE file in the official repository before any commercial use.',
    commercialUse: 'check',
    licenseSources: [],
    windows: 'Windows. Confirm the supported versions on the project page.',
    whenToUse: ['Comparing frame rate and stutter before and after a change, in a repeatable scene.', 'Separating a low average from frame-time spikes.'],
    whenNotToUse: ['Games whose anti-cheat restricts capture tools. Check the game’s policy first.', 'Non-gaming performance. Task Manager and Resource Monitor are better there.'],
    install: [
      'Download from the project’s releases page and extract to its own folder.',
      'Set up capture as the project documents for your Windows and GPU. PresentMon-based capture is the common route.',
    ],
    recommendedConfig: ['Capture at least 60 seconds per run.', 'Keep settings and scene identical between runs. Change only one variable at a time.'],
    usage: [
      'Start the capture before entering the scene, and stop it after 60 seconds.',
      'Read Average FPS, 1% Low, and the frame-time graph. Compare the lows with the average.',
      'Record the values in the session’s measurements, with the conditions.',
    ],
    metrics: [
      { name: 'Average FPS', meaning: 'Frames divided by the capture duration. Short stalls disappear into the average.' },
      { name: '1% Low', meaning: 'The frame rate of the slowest 1% of frames. A large gap from the average points to stutter.' },
      { name: 'Frame time (ms)', meaning: 'Time between frames. Spikes match the stutter the customer sees.' },
    ],
    mistakes: [
      'Trusting one run. Compare at least three repeatable runs.',
      'Changing the scene, the settings, or the background programs between runs.',
      'Reading only the average. Stutter shows up in the lows and the spikes.',
    ],
    safety: ['Ask the customer before running overlays or capture tools in multiplayer games.', 'Do not modify game files to enable capture.'],
    relatedProblems: ['gaming-low-fps', 'frame-time-spikes', 'stuttering', 'inconsistent-performance'],
    alternatives: ['hwinfo64'],
    verification: ['Repeat the same scene and capture after the change, under the same conditions.'],
    unverified: [
      'Project address, license, supported Windows versions, and menu names were not checked in this build.',
    ],
    procedureIds: ['gaming-frame-capture'],
  },
  {
    id: 'bleachbit',
    name: 'BleachBit',
    category: 'Cleanup and storage',
    purpose: 'Removes temporary files, caches, and logs from Windows and from applications, with a preview before anything is deleted.',
    website: 'https://www.bleachbit.org/',
    downloadSource: 'bleachbit.org. Use the official installer or portable build.',
    license: 'Open source under the GNU General Public License. Verify the license version on the project page.',
    commercialUse: 'check',
    licenseSources: ['https://www.bleachbit.org/'],
    windows: 'Windows. Some cleaners need administrator rights.',
    whenToUse: ['Temporary files and caches are confirmed as the storage problem after a WizTree analysis.', 'Browser cache cleanup with the customer’s agreement.'],
    whenNotToUse: ['Performance complaints without a storage problem. Cleaning does not address startup or background load.', 'Any time the customer has not agreed to deleting browser data.'],
    install: ['Download from bleachbit.org and choose the installer or the portable build.', 'Run as administrator only when a system cleaner is needed.'],
    recommendedConfig: [
      'Use Preview first and read the list before cleaning.',
      'Leave the shredding and free-space overwrite options off unless the customer needs them. They are slow.',
    ],
    usage: ['Tick only the cleaners the customer has approved.', 'Click Preview, read the list, then clean.', 'Record which cleaners ran.'],
    metrics: [{ name: 'Space recovered', meaning: 'BleachBit’s estimate of what it will free. Confirm with free space measured before and after.' }],
    mistakes: [
      'Ticking browser entries without warning. Browser cleaners can remove saved sign-ins, cookies, and history.',
      'Using shredding or overwrite options for routine cleanup.',
      'Assuming cleaning fixes slowness.',
    ],
    safety: ['Confirm browser cleaners with the customer. Sign-ins and session data can be lost.', 'Make a backup before cleaning anything that touches user files.'],
    relatedProblems: ['low-disk-space', 'unnecessary-applications'],
    alternatives: ['storage-sense'],
    verification: ['Measure free space before and after, and record both values.'],
    unverified: ['License version and current cleaner names were not checked in this build.'],
    procedureIds: ['disk-space-recovery'],
  },
  {
    id: 'storage-sense',
    name: 'Storage Sense',
    category: 'Built into Windows',
    purpose: 'Windows’ built-in automatic cleanup for temporary files, the Recycle Bin, and older Windows files.',
    website: 'Built into Windows: Settings > System > Storage > Storage Sense.',
    downloadSource: 'Not applicable. Included with Windows.',
    license: 'Part of Windows.',
    commercialUse: 'free',
    licenseSources: [],
    windows: 'Windows 10 and 11. Option names differ between versions.',
    whenToUse: ['Ongoing automatic cleanup after the one-time review.', 'Clearing temporary files and Recycle Bin items on a schedule the customer agrees to.'],
    whenNotToUse: ['Removing old Windows installations without the customer’s agreement.', 'Replacing a review of large folders.'],
    install: ['Nothing to install. Open Settings > System > Storage and turn on Storage Sense.'],
    recommendedConfig: [
      'Delete temporary files that apps are not using: on.',
      'Recycle Bin: delete items older than 30 days, or the period the customer agrees to.',
      'Downloads: leave at Never unless the customer wants automatic cleanup.',
      'Delete previous versions of Windows: off, unless the customer agrees.',
    ],
    usage: ['Run Storage Sense now from the Storage page, and compare free space before and after.', 'Note what it reports as removed.'],
    metrics: [{ name: 'Free space', meaning: 'Shown on the Storage page and in File Explorer. Record before and after values.' }],
    mistakes: [
      'Turning on previous-version cleanup without telling the customer. It removes the rollback path for the last Windows upgrade.',
      'Assuming automatic cleanup replaces a review of large folders.',
    ],
    safety: ['Removing previous Windows versions cannot be easily undone. Confirm before running it.'],
    relatedProblems: ['low-disk-space', 'unexplained-storage-usage'],
    alternatives: ['bleachbit', 'wiztree'],
    verification: ['Record free space before and after.', 'Confirm the Recycle Bin setting matches what was agreed.'],
    unverified: ['Option names and locations vary by Windows version. Check them on the machine.'],
    procedureIds: ['disk-space-recovery'],
  },
];

export const SOFTWARE_BY_ID = Object.fromEntries(SOFTWARE.map((s) => [s.id, s])) as Record<string, SoftwareEntry>;

/** Tools in the brief’s catalog that do not have an entry yet. They are named, not described. */
export const PENDING_TOOLS: { id: string; name: string; category: SoftwareCategory }[] = [
  { id: 'resource-monitor', name: 'Resource Monitor', category: 'Built into Windows' },
  { id: 'reliability-monitor', name: 'Reliability Monitor', category: 'Built into Windows' },
  { id: 'event-viewer', name: 'Event Viewer', category: 'Built into Windows' },
  { id: 'performance-monitor', name: 'Performance Monitor', category: 'Built into Windows' },
  { id: 'windows-disk-management', name: 'Windows Disk Management', category: 'Cleanup and storage' },
  { id: 'windows-optimize-drives', name: 'Windows Optimize Drives', category: 'Cleanup and storage' },
  { id: 'dism', name: 'DISM', category: 'Cleanup and storage' },
  { id: 'system-file-checker', name: 'System File Checker', category: 'Cleanup and storage' },
  { id: 'treesize-free', name: 'TreeSize Free', category: 'Cleanup and storage' },
  { id: 'spacesniffer', name: 'SpaceSniffer', category: 'Cleanup and storage' },
  { id: 'bulk-crap-uninstaller', name: 'Bulk Crap Uninstaller', category: 'Cleanup and storage' },
  { id: 'revo-uninstaller', name: 'Revo Uninstaller', category: 'Cleanup and storage' },
  { id: 'geek-uninstaller', name: 'Geek Uninstaller', category: 'Cleanup and storage' },
  { id: 'ms-pc-manager', name: 'Microsoft PC Manager', category: 'Cleanup and storage' },
  { id: 'czkawka', name: 'Czkawka', category: 'Cleanup and storage' },
  { id: 'dupeguru', name: 'dupeGuru', category: 'Cleanup and storage' },
  { id: 'everything', name: 'Everything', category: 'Cleanup and storage' },
  { id: 'file-juggler', name: 'File Juggler', category: 'Cleanup and storage' },
  { id: 'dropit', name: 'DropIt', category: 'Cleanup and storage' },
  { id: 'powerrename', name: 'PowerRename', category: 'Cleanup and storage' },
  { id: 'freefilesync', name: 'FreeFileSync', category: 'Cleanup and storage' },
  { id: 'cpu-z', name: 'CPU-Z', category: 'Diagnostics and performance' },
  { id: 'gpu-z', name: 'GPU-Z', category: 'Diagnostics and performance' },
  { id: 'occt', name: 'OCCT', category: 'Diagnostics and performance' },
  { id: 'windows-memory-diagnostic', name: 'Windows Memory Diagnostic', category: 'Diagnostics and performance' },
  { id: 'latencymon', name: 'LatencyMon', category: 'Diagnostics and performance' },
  { id: 'batteryinfoview', name: 'BatteryInfoView', category: 'Diagnostics and performance' },
  { id: 'hwmonitor', name: 'HWMonitor', category: 'Diagnostics and performance' },
  { id: 'process-explorer', name: 'Process Explorer', category: 'Diagnostics and performance' },
  { id: 'process-monitor', name: 'Process Monitor', category: 'Diagnostics and performance' },
  { id: 'rammap', name: 'RAMMap', category: 'Diagnostics and performance' },
  { id: 'vmmap', name: 'VMMap', category: 'Diagnostics and performance' },
  { id: 'tcpview', name: 'TCPView', category: 'Diagnostics and performance' },
  { id: 'sigcheck', name: 'Sigcheck', category: 'Diagnostics and performance' },
  { id: 'handle', name: 'Handle', category: 'Diagnostics and performance' },
  { id: 'diskmon', name: 'DiskMon', category: 'Diagnostics and performance' },
  { id: 'presentmon', name: 'PresentMon', category: 'Diagnostics and performance' },
  { id: 'msi-afterburner', name: 'MSI Afterburner', category: 'Diagnostics and performance' },
  { id: 'rtss', name: 'RivaTuner Statistics Server', category: 'Diagnostics and performance' },
  { id: '3dmark', name: '3DMark', category: 'Diagnostics and performance' },
  { id: 'cinebench', name: 'Cinebench', category: 'Diagnostics and performance' },
  { id: 'crystaldiskmark', name: 'CrystalDiskMark', category: 'Diagnostics and performance' },
  { id: 'windows-performance-recorder', name: 'Windows Performance Recorder', category: 'Diagnostics and performance' },
  { id: 'windows-performance-analyzer', name: 'Windows Performance Analyzer', category: 'Diagnostics and performance' },
];

/** Resolves a tool id to either a written entry or a pending name. */
export function resolveTool(id: string): { kind: 'entry'; entry: SoftwareEntry } | { kind: 'pending'; name: string } | undefined {
  const entry = SOFTWARE_BY_ID[id];
  if (entry) return { kind: 'entry', entry };
  const pending = PENDING_TOOLS.find((p) => p.id === id);
  if (pending) return { kind: 'pending', name: pending.name };
  return undefined;
}

export function toolName(id: string): string {
  const r = resolveTool(id);
  if (!r) return id;
  return r.kind === 'entry' ? r.entry.name : r.name;
}
