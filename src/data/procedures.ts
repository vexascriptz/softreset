export interface ProcedureStep {
  text: string;
  /** Optional technical detail, shown in an expandable block. */
  detail?: string;
}

export interface RecommendedSetting {
  setting: string;
  value: string;
  when: string;
}

export interface Procedure {
  id: string;
  title: string;
  softwareId: string;
  purpose: string;
  whenToUse: string[];
  preparation: string[];
  steps: ProcedureStep[];
  recommendedSettings: RecommendedSetting[];
  expected: string[];
  interpretation: string[];
  nextSteps: string[];
  verification: string[];
  rollback: string[];
  safety: string[];
  estimatedMinutes: number;
}

export const PROCEDURES: Procedure[] = [
  {
    id: 'task-manager-baseline',
    title: 'Capture a Task Manager baseline',
    softwareId: 'task-manager',
    purpose: 'Record what the computer does at idle and under the customer’s load, so every later change has a comparison point.',
    whenToUse: ['Any performance complaint, before changing anything.', 'After a change, to confirm the effect under the same conditions.'],
    preparation: [
      'Record the Windows version and the programs the customer uses.',
      'Close any program the customer does not need for the test.',
      'Confirm no update install or restart is pending.',
    ],
    steps: [
      { text: 'Open Task Manager with Ctrl+Shift+Esc. If it opens in compact form, select More details.' },
      {
        text: 'Leave the computer alone for two minutes. On the Performance tab, read CPU, Memory, and Disk.',
        detail: 'Use the typical value over the two minutes. A single spike is not a baseline.',
      },
      {
        text: 'On the Processes tab, sort by CPU. Note the top five processes and their values.',
        detail: 'Then sort by Memory and by Disk and note the top five for each. Some processes appear in more than one list.',
      },
      {
        text: 'Open Startup apps. Count the rows with status Enabled and note the Startup impact column if it is shown.',
        detail: 'Startup impact is Windows’ estimate, not a measurement.',
      },
      { text: 'Record the values with the conditions: the open programs, the time, and the Windows build.' },
      {
        text: 'Repeat the Processes check while the customer does the slow task. Note the peak values.',
        detail: 'The peak values under load are the ones that explain a complaint. The idle values explain background work.',
      },
    ],
    recommendedSettings: [
      { setting: 'Performance graph update speed', value: 'Normal', when: 'The default. Faster updates add overhead and can distort a long measurement. Confirm the menu name on your build.' },
    ],
    expected: ['Idle CPU and Disk values with a named set of background processes.', 'Peak values for the customer’s slow task with the processes responsible.'],
    interpretation: [
      'Starting points: a healthy desktop at idle usually stays under about 10% CPU and 15% disk active time.',
      'Thresholds depend on the workload. A value that is normal during a render is not normal at idle.',
      'High memory use is normal when cache fills free memory. Look at the peak during the complaint, not the number alone.',
    ],
    nextSteps: [
      'If idle activity is high, identify the processes and then use the startup-review procedure.',
      'If memory peaks near the limit during load, reduce what the customer does not need and discuss capacity.',
    ],
    verification: ['Repeat the same idle and load readings under the same conditions after a change.'],
    rollback: ['This procedure changes nothing. There is nothing to reverse.'],
    safety: ['Do not end a process you cannot identify. Look it up first.', 'Ending a process can lose unsaved work. Ask the customer first.'],
    estimatedMinutes: 15,
  },
  {
    id: 'startup-review',
    title: 'Review startup items',
    softwareId: 'autoruns',
    purpose: 'Find the programs and tasks that start with Windows, identify the ones the customer does not need, and disable only those.',
    whenToUse: ['Sign-in is slow and the enabled-items count is high.', 'Background activity is high at idle and the Processes tab names startup programs.'],
    preparation: [
      'Record the enabled-items count and the sign-in time, using the Task Manager baseline.',
      'Ask the customer which programs they use and which they remember installing.',
      'Make a note of the current state before changing anything.',
    ],
    steps: [
      { text: 'In Task Manager, open Startup apps. Note each item’s publisher, status, and startup impact.' },
      {
        text: 'Open Autoruns as administrator. Start on the Logon tab.',
        detail: 'Autoruns shows the full startup set, including scheduled tasks and services. Menu names can differ by version; confirm them on your build.',
      },
      {
        text: 'Turn on the option that hides Microsoft entries while you review third-party items.',
        detail: 'Turn it off again when auditing Windows components. Hiding Microsoft entries is a view setting only.',
      },
      {
        text: 'For each third-party entry, note the publisher, the image path, and whether the customer recognizes it.',
        detail: 'Use the signature verification option if it is available. An unsigned or unexpected file needs a closer look.',
      },
      { text: 'Mark each entry: keep, disable, or unknown. Leave every unknown entry enabled.' },
      {
        text: 'Disable at most five entries that you have marked as disable, by clearing their checkboxes.',
        detail: 'Changing a few at a time makes a problem easier to trace if one of them turns out to matter.',
      },
      { text: 'Restart the computer. Repeat the sign-in measurement and the enabled-items count under the same conditions.' },
      { text: 'Record each change in the session’s settings-changed list, with the original state.' },
    ],
    recommendedSettings: [
      { setting: 'Autoruns: hide Microsoft entries', value: 'On while reviewing', when: 'Shows third-party entries, which are more likely to be optional. Turn it off for a full audit.' },
      { setting: 'Autoruns: run as administrator', value: 'Yes', when: 'Required to see and change every entry.' },
      { setting: 'Autoruns: VirusTotal checking', value: 'Off', when: 'It sends file hashes to a third party. Enable it only with the customer’s agreement.' },
    ],
    expected: ['An enabled-items list where each entry has a publisher and a path.', 'A short list of entries that the customer confirms they do not need.'],
    interpretation: [
      'Entries from the publisher of software the customer installed on purpose are usually safe to keep.',
      'Duplicate updaters, unknown publishers, and helper programs with no clear purpose are candidates to disable, once confirmed.',
      'A high count is not a diagnosis by itself. The sign-in time and the idle activity decide whether it matters.',
    ],
    nextSteps: ['If sign-in time improves and the complaint persists, return to the workflow and check memory or background activity.'],
    verification: ['Re-measure sign-in time and the enabled-items count.', 'Confirm the customer’s programs start and work after the next sign-in.'],
    rollback: [
      'In Autoruns, tick the checkbox again. In Task Manager’s Startup apps, enable the item again.',
      'If you saved the state before the change, compare against it to confirm exactly what was turned off.',
    ],
    safety: [
      'Do not disable security software, drivers, or hardware control software without the customer’s approval.',
      'Do not delete entries. Clearing a checkbox keeps the way back.',
    ],
    estimatedMinutes: 30,
  },
  {
    id: 'disk-space-recovery',
    title: 'Recover disk space safely',
    softwareId: 'wiztree',
    purpose: 'Find what owns the space, remove only what the customer approves, and measure the result.',
    whenToUse: ['Free space is below about 10%, or the customer cannot explain why the drive is full.'],
    preparation: [
      'Confirm the drive and the list of what the customer must keep.',
      'Confirm a backup exists for any user data that will be moved or removed.',
      'Record free space and total capacity from File Explorer.',
    ],
    steps: [
      { text: 'Start WizTree. Select the drive and scan it.', detail: 'Running as administrator scans NTFS drives fully. Check the license on the library page before using it on a customer’s computer.' },
      { text: 'Sort by size, largest first. Expand the five largest folders and note their names and sizes.' },
      {
        text: 'Classify each large folder: application, user data, cache or temporary, Windows, or unknown.',
        detail: 'A large folder is not junk by default. Games, projects, and virtual machine folders are often large and necessary.',
      },
      { text: 'Do not change Windows folders, Program Files, or any folder you cannot name. Ask the customer about each unknown.' },
      {
        text: 'Uninstall programs the customer does not use, through Settings > Apps > Installed apps.',
        detail: 'The program’s own uninstaller is the clean route. Do not delete program folders by hand.',
      },
      {
        text: 'Run Storage Sense now for temporary files and the Recycle Bin, with the customer’s agreement.',
        detail: 'Settings > System > Storage > Storage Sense. Check whether previous Windows versions are listed. Do not remove them without explicit agreement.',
      },
      { text: 'Empty the Recycle Bin only after the customer confirms its contents can go.' },
      { text: 'Measure free space again on the same drive, and record it with the conditions.' },
    ],
    recommendedSettings: [
      { setting: 'Storage Sense: delete temporary files', value: 'On', when: 'Safe automatic cleanup. Option names vary by Windows version.' },
      { setting: 'Storage Sense: Recycle Bin', value: 'Delete items older than 30 days', when: 'Or the period the customer agrees to.' },
      { setting: 'Storage Sense: previous Windows versions', value: 'Off', when: 'Only turn it on with explicit agreement. It removes the rollback path.' },
    ],
    expected: ['A list of the largest folders, each with an owner.', 'Free space that is higher after cleanup than before, by a measured amount.'],
    interpretation: [
      'Free space under about 10% limits Windows’ working room for updates and temporary files.',
      'The biggest gains usually come from applications and media the customer no longer needs, not from caches.',
    ],
    nextSteps: ['If free space stays low, the customer may need to move media off the drive or consider a larger drive. Let them decide.'],
    verification: ['Free space measured the same way before and after.', 'Confirm the customer can open the files they wanted to keep.'],
    rollback: [
      'Files sent to the Recycle Bin can be restored until it is emptied.',
      'Permanent deletions cannot be reversed. Uninstalled programs can be reinstalled from the vendor.',
    ],
    safety: [
      'Confirm backups before any deletion of user data.',
      'Verify the license for WizTree before using it on a customer’s computer.',
      'Prefer File Explorer or the uninstaller for deletions, so the normal Windows recovery path applies.',
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'disk-health-check',
    title: 'Check drive health',
    softwareId: 'crystaldiskinfo',
    purpose: 'Read the drive’s SMART health status and attributes, and record them for comparison.',
    whenToUse: ['Slow storage, errors, or a drive that disappears.', 'The sign-in workflow points to storage.', 'A maintenance report needs a health record.'],
    preparation: ['Know which drive you are checking, from the model in Device Manager or Settings > System > Storage.'],
    steps: [
      { text: 'Open CrystalDiskInfo. Select the drive from the Disk menu if more than one is listed.' },
      { text: 'Read the Health Status: Good, Caution, or Bad. Note the model, interface, and firmware.' },
      {
        text: 'Read the attribute table. For SATA drives, note Reallocated Sectors Count, Current Pending Sector Count, and Uncorrectable Sector Count.',
        detail: 'Non-zero values in the last two are the most important. A rising Reallocated count is a warning even if the status says Good.',
      },
      { text: 'For NVMe drives, note Available Spare, Percentage Used, and the media and data integrity errors.', detail: 'Confirm the labels against the drive you have. Names differ between drives.' },
      { text: 'Note the temperature, and the Power On Hours value.' },
      {
        text: 'If the status is Caution or Bad, stop and advise the customer to back up before any other work.',
        detail: 'Do not run repair or optimization tools on a failing drive as a first step.',
      },
      { text: 'Record the status and values with the date, so a later reading can be compared.' },
    ],
    recommendedSettings: [
      { setting: 'Background monitoring and alerts', value: 'Off', when: 'Unless the customer asks for alerts. Turn them on only with their agreement.' },
      { setting: 'Function menu options (for example acoustic or power management)', value: 'Leave alone', when: 'Changing these needs knowledge of how to revert them. Record only.' },
    ],
    expected: ['A health status and a list of attribute values for the drive.'],
    interpretation: [
      'Good means no problem was detected by the attributes it reads. It does not guarantee the drive will last.',
      'Caution means act soon. Bad means back up now.',
      'A rising count of reallocated or pending sectors is more important than any single value.',
    ],
    nextSteps: ['If the status is Good and the values are stable, return to the workflow that brought you here.', 'If there are warnings, advise a backup and a hardware review.'],
    verification: ['Repeat the reading after any change, and compare the values with the record.'],
    rollback: ['This procedure only reads data. Nothing is changed unless you changed a setting, in which case revert it.'],
    safety: ['If the drive reports Caution or Bad, back up first.', 'Avoid advanced options in the Function menu unless you know how to revert them.'],
    estimatedMinutes: 10,
  },
  {
    id: 'gaming-frame-capture',
    title: 'Capture frame times in a repeatable scene',
    softwareId: 'capframex',
    purpose: 'Measure average frame rate, 1% lows, and frame-time spikes in the same scene, so changes can be compared fairly.',
    whenToUse: ['Low frame rate, stutter, or inconsistent performance in a game.', 'Comparing settings or drivers before and after a change.'],
    preparation: [
      'Record the setup: game version, graphics preset, resolution, refresh rate, frame cap, V-Sync or variable refresh, and upscaling.',
      'Choose a repeatable scene with a clear start and end point. Use a built-in benchmark if the game has one.',
      'Close background programs the customer can close. Leave the ones they cannot.',
      'Check the game’s policy on capture tools if it is an online game.',
    ],
    steps: [
      { text: 'Warm up the game for two minutes in the scene, so shader compilation and loading are finished.' },
      { text: 'Start the capture in CapFrameX, or your PresentMon-based tool, just before the scene begins.' },
      { text: 'Run the scene for 60 seconds, then stop the capture.', detail: 'Shorter captures make the 1% low unstable.' },
      { text: 'Repeat the same scene two more times, for three runs in total.', detail: 'Compare consistency across runs, not only the best run.' },
      { text: 'Note the average FPS, the 1% low, and the average frame time for each run.' },
      { text: 'Look at the frame-time graph for spikes. Note when they happen in the scene.' },
      {
        text: 'In HWiNFO64 (Sensors-only), note the average GPU and CPU utilization, and the lowest clock speed, over the same windows.',
        detail: 'A clock that falls while temperature rises is throttling. Utilization alone does not show it.',
      },
      { text: 'Record the values with the setup record in the session’s measurements.' },
    ],
    recommendedSettings: [
      { setting: 'Capture length', value: '60 seconds minimum', when: 'Shorter captures make the 1% low unstable.' },
      { setting: 'Runs per scene', value: 'Three, identical settings', when: 'Lets you see whether the result repeats.' },
      { setting: 'Frame cap', value: 'Record it, and do not change it during the test', when: 'Changing a cap mid-comparison makes the results incomparable.' },
    ],
    expected: ['Three runs with average FPS, 1% low, and average frame time.', 'Utilization and clock data for the same windows.'],
    interpretation: [
      'A 1% low well below the average (below about 60% of it) indicates stutter, not only a low speed.',
      'GPU utilization at or above about 95% means the GPU is the limit. A low GPU with a busy CPU suggests the processor.',
      'Falling clocks at high temperatures point to throttling. Look for that in the clock history.',
    ],
    nextSteps: ['Change one setting at a time, and capture the same scene after each change.', 'If stutter lines up with disk activity, the storage is the next thing to examine.'],
    verification: ['Repeat the same three-run capture under the same conditions after a change, and compare.'],
    rollback: ['Restore any game setting you changed during testing to the value in the setup record.'],
    safety: ['Ask before using overlays or capture tools in multiplayer games.', 'Do not edit game files to enable capture.'],
    estimatedMinutes: 25,
  },
];

export const PROCEDURE_BY_ID = Object.fromEntries(PROCEDURES.map((p) => [p.id, p])) as Record<string, Procedure>;
