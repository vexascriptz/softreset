import type { DiagnosticTree, MeasureOutcome, Observation } from './types';

const SSD_BOOT_LIMIT = 60;
const HDD_BOOT_LIMIT = 120;
const HEAVY_STARTUP_ITEMS = 12;

function bootLimit(answers: Record<string, string>): { limit: number; note: string } {
  if (answers.driveType === 'hdd') return { limit: HDD_BOOT_LIMIT, note: '' };
  if (answers.driveType === 'ssd') return { limit: SSD_BOOT_LIMIT, note: '' };
  return { limit: SSD_BOOT_LIMIT, note: ' The drive type is unknown, so the SSD threshold is used. Check the drive type and reread this step if it is a hard drive.' };
}

export const generalSlowdown: DiagnosticTree = {
  problemId: 'general-slowdown',
  title: 'General system slowdown',
  intro:
    'The customer says the computer has become slow. This workflow finds out when the slowdown happens, then measures the resource most likely to explain it before any setting is changed.',
  estimatedMinutes: 25,
  start: 'prep',
  nodes: {
    prep: {
      type: 'checklist',
      id: 'prep',
      title: 'Set up a clean baseline',
      why: 'A measurement taken during a pending update, a restart, or a browser that is loading tabs will mislead you. Confirm the machine is in a normal state first.',
      items: [
        'Record the Windows version and build (run winver).',
        'Confirm no Windows Update installation or restart is pending.',
        'Ask the customer what they were doing when the slowdown started.',
        'Leave the customer’s usual programs open for the test. Close only the ones they do not need.',
      ],
      next: 'onset',
    },
    onset: {
      type: 'choice',
      id: 'onset',
      title: 'When the slowdown appears',
      why: 'The moment the slowdown shows up tells you which resource to examine first. Startup, load, and idle problems have different causes.',
      prompt: 'When does the customer notice the slowdown?',
      answerKey: 'onset',
      options: [
        { label: 'Right after sign-in, then it settles', value: 'boot', next: 'drive-type' },
        { label: 'Only when several programs are open', value: 'load', next: 'ram-measure' },
        { label: 'Even when nothing is open', value: 'idle', next: 'idle-measure' },
        { label: 'Only in one program', value: 'one-app', next: 'one-app-check' },
      ],
    },
    'drive-type': {
      type: 'choice',
      id: 'drive-type',
      title: 'Drive type',
      why: 'Startup time means different things on an SSD and on a mechanical hard drive. The same number needs a different threshold.',
      prompt: 'What kind of drive does Windows start from?',
      answerKey: 'driveType',
      options: [
        { label: 'SSD or NVMe', value: 'ssd', next: 'boot-measure' },
        { label: 'Mechanical hard drive', value: 'hdd', next: 'boot-measure' },
        { label: 'Not sure yet', value: 'unknown', next: 'boot-measure' },
      ],
    },
    'boot-measure': {
      type: 'measure',
      id: 'boot-measure',
      title: 'Sign-in time and startup load',
      why: 'Slow sign-in combined with many enabled startup items points to startup load. Slow sign-in with few items points elsewhere, usually the disk or a driver.',
      instructions: [
        'Restart the computer, then sign in with the customer’s usual account.',
        'Start a stopwatch when the desktop first appears. Stop it when the taskbar and tray respond without delay and the disk activity in Task Manager has settled.',
        'Open Task Manager > Startup apps and count the rows with status Enabled.',
      ],
      softwareIds: ['task-manager'],
      fields: [
        { key: 'boot-seconds', label: 'Sign-in to usable desktop', unit: 's', hint: 'From the stopwatch. Enter whole seconds.', min: 5, max: 1200, metric: 'boot-seconds' },
        { key: 'startup-items', label: 'Enabled startup items', unit: 'items', hint: 'Count from Startup apps.', min: 0, max: 300, metric: 'startup-items' },
      ],
      basis:
        'Starting points, not universal limits: about 60 seconds to a responsive desktop on an SSD and about 120 seconds on a hard drive. Startup items count as heavy at 12 or more enabled. Adjust for the customer’s hardware.',
      interpret: (v, a): MeasureOutcome => {
        const boot = v['boot-seconds'] ?? 0;
        const items = v['startup-items'] ?? 0;
        const { limit, note } = bootLimit(a);
        const observations: Observation[] = [];
        const slow = boot > limit;
        const heavy = items >= HEAVY_STARTUP_ITEMS;

        if (slow && heavy) {
          observations.push({ level: 'notice', text: `Sign-in took ${boot} s with ${items} enabled startup items. Startup load is the most likely contributor.${note}` });
          return { observations, next: 'result-startup', summary: 'Slow sign-in with many startup items.' };
        }
        if (slow) {
          observations.push({ level: 'notice', text: `Sign-in took ${boot} s, but only ${items} items are enabled. Startup items are less likely to be the cause. Check the disk and its drivers.${note}` });
          return { observations, next: 'result-disk-health', summary: 'Slow sign-in with few startup items.' };
        }
        if (heavy) {
          observations.push({ level: 'info', text: `Sign-in took ${boot} s, which is within range for this drive. ${items} enabled items may still add work after sign-in.${note}` });
        } else {
          observations.push({ level: 'info', text: `Sign-in took ${boot} s with ${items} enabled items. Neither is outside the expected range.${note}` });
        }
        return { observations, next: 'ram-measure', summary: 'Sign-in within range.' };
      },
    },
    'one-app-check': {
      type: 'choice',
      id: 'one-app-check',
      title: 'Is the slowdown tied to one program?',
      why: 'If closing the program ends the slowdown, the program is the best suspect. If it continues, the program is probably a symptom of a system-wide limit.',
      prompt: 'Does the slowdown stop when that program is closed?',
      answerKey: 'oneApp',
      options: [
        { label: 'Yes, it stops', value: 'yes', next: 'result-app' },
        { label: 'No, it continues', value: 'no', next: 'ram-measure' },
      ],
    },
    'idle-measure': {
      type: 'measure',
      id: 'idle-measure',
      title: 'Idle load',
      why: 'Activity with nothing open usually comes from background work: updaters, indexing, sync clients, or scheduled tasks.',
      instructions: [
        'Close every program except Task Manager.',
        'Leave the computer alone for two minutes.',
        'On the Performance tab, note the typical CPU and Disk values during that time. Use the typical value, not the highest spike.',
      ],
      softwareIds: ['task-manager'],
      fields: [
        { key: 'cpu-idle-pct', label: 'CPU at idle', unit: '%', hint: 'Typical value over two minutes.', min: 0, max: 100, metric: 'cpu-idle-pct' },
        { key: 'disk-idle-pct', label: 'Disk active time at idle', unit: '%', hint: 'Typical value over two minutes.', min: 0, max: 100, metric: 'disk-idle-pct' },
      ],
      basis:
        'Starting points: a healthy desktop at idle usually stays under about 10% CPU and under about 15% disk active time. Sustained values above these suggest background work. Some systems run scheduled scans at idle, so repeat the reading at a different time if it is borderline.',
      interpret: (v): MeasureOutcome => {
        const cpu = v['cpu-idle-pct'] ?? 0;
        const disk = v['disk-idle-pct'] ?? 0;
        if (cpu >= 10 || disk >= 15) {
          return {
            observations: [
              { level: 'notice', text: `Idle CPU is ${cpu}% and disk activity is ${disk}%. Work is running with nothing open, so background activity is a likely contributor.` },
            ],
            next: 'result-background',
            summary: 'Background activity at idle.',
          };
        }
        return {
          observations: [
            { level: 'info', text: `Idle load is low (CPU ${cpu}%, disk ${disk}%). Background activity does not explain the slowdown on its own.` },
          ],
          next: 'result-inconclusive',
          summary: 'Idle load is low.',
        };
      },
    },
    'ram-measure': {
      type: 'measure',
      id: 'ram-measure',
      title: 'Memory under the customer’s real workload',
      why: 'Memory pressure slows every program at once, because Windows must move data between RAM and the disk. High use alone is not a fault; the peak combined with the slowdown is what matters.',
      instructions: [
        'Recreate the slowdown with the customer’s usual programs open. Work until it feels slow, and watch Task Manager > Performance > Memory.',
        'Note the highest "In use" value. This excludes cached memory, which Windows uses on purpose.',
        'Close the programs and note the "In use" value at idle.',
        'Note the total installed memory.',
      ],
      softwareIds: ['task-manager'],
      fields: [
        { key: 'ram-total-gb', label: 'Installed memory', unit: 'GB', hint: 'Total shown in Task Manager > Memory.', min: 2, max: 256 },
        { key: 'ram-peak-pct', label: 'Peak memory in use during slowdown', unit: '%', hint: 'Highest "In use" value.', min: 0, max: 100, metric: 'ram-peak-pct' },
        { key: 'ram-idle-pct', label: 'Memory in use at idle', unit: '%', hint: 'After closing the programs.', min: 0, max: 100, metric: 'ram-idle-pct' },
      ],
      basis:
        'Starting points: peak use at or above 90% is memory pressure on any capacity. Use at or above 75% on 8 GB or less is a strong candidate. Idle use at or above 60% means something is holding memory before the customer starts work.',
      interpret: (v): MeasureOutcome => {
        const total = v['ram-total-gb'] ?? 0;
        const peak = v['ram-peak-pct'] ?? 0;
        const idle = v['ram-idle-pct'] ?? 0;
        if (peak >= 90) {
          return {
            observations: [{ level: 'concern', text: `Memory reached ${peak}% during the slowdown on ${total} GB. Windows is likely moving data to disk, which slows everything at once.` }],
            next: 'result-memory',
            summary: 'Memory reached 90% or more during the slowdown.',
          };
        }
        if (total <= 8 && peak >= 75) {
          return {
            observations: [{ level: 'notice', text: `Peak memory of ${peak}% on ${total} GB is high for this capacity. Limited memory is a plausible cause.` }],
            next: 'result-memory',
            summary: 'High peak memory on limited capacity.',
          };
        }
        if (idle >= 60) {
          return {
            observations: [{ level: 'notice', text: `Memory stays at ${idle}% with nothing open. Background processes are holding a large share before the customer starts work.` }],
            next: 'result-background',
            summary: 'Memory held by background processes.',
          };
        }
        return {
          observations: [{ level: 'info', text: `Memory peaked at ${peak}% and idles at ${idle}%. Neither level explains the slowdown on its own.` }],
          next: 'result-inconclusive',
          summary: 'Memory is not the limit.',
        };
      },
    },

    // ---- Results

    'result-startup': {
      type: 'result',
      id: 'result-startup',
      title: 'Startup load is the likely contributor',
      why: 'The conclusion is only as strong as the measurements behind it. Read the uncertainty before acting.',
      confidence: 'medium',
      summary:
        'Slow sign-in with many enabled startup items points to startup load. Those items compete for the disk and CPU in the first minutes of use, so they can also make the early session feel slow.',
      causes: ['Many enabled startup items competing for the disk and CPU', 'Updaters and helper services started alongside the programs the customer uses'],
      uncertainty:
        'Sign-in time does not prove the items cause the complaint. Memory or background activity may also be involved. Confirm with a re-measurement after the change.',
      actions: [
        {
          text: 'Review the enabled startup items. Disable only those you can identify and the customer does not need.',
          why: 'Disabling a startup entry is reversible and cuts work at sign-in without uninstalling anything.',
          procedureId: 'startup-review',
          safety: 'Do not disable security software, drivers, or items you cannot name. Check each one in Autoruns first.',
        },
      ],
      verify: ['Re-measure sign-in time and the enabled-items count under the same conditions.', 'Ask the customer whether the early session feels different after a day of normal use.'],
    },
    'result-background': {
      type: 'result',
      id: 'result-background',
      title: 'Background activity is using resources',
      why: 'Background work is often the cause of a slowdown that happens with nothing open.',
      confidence: 'medium',
      summary:
        'Processes, scheduled tasks, or services are using CPU, memory, or disk with no user action. Naming them is the step that turns a general complaint into something you can change or explain.',
      causes: ['Processes or scheduled tasks running with no user action', 'Pending update, indexing, or sync work'],
      uncertainty:
        'Some background work is expected. Only work the customer does not need, or work that is clearly excessive for the machine, is worth changing.',
      actions: [
        {
          text: 'Find the processes using CPU and disk at idle. Sort Task Manager’s Processes tab by CPU, then by Disk.',
          why: 'Each named process points to a program or service you can explain to the customer.',
          procedureId: 'task-manager-baseline',
        },
        {
          text: 'Review autostart and scheduled entries in Autoruns. Disable only entries whose publisher and purpose you can confirm and the customer does not need.',
          why: 'Startup and scheduled entries are the usual source of recurring background work.',
          procedureId: 'startup-review',
          safety: 'Leave Windows components and security software alone unless the customer asks otherwise.',
        },
      ],
      verify: ['Repeat the two-minute idle reading under the same conditions.', 'Confirm the customer’s programs still start and work.'],
    },
    'result-memory': {
      type: 'result',
      id: 'result-memory',
      title: 'Memory pressure during load',
      why: 'Memory pressure is a capacity-and-workload question. Some of it you can fix with the programs, and some needs a hardware decision.',
      confidence: 'medium',
      summary:
        'Memory use peaks high enough during the complaint that Windows is likely paging data to disk. That slows every program, not only the one the customer is using.',
      causes: ['Peak use exceeds what the installed memory can hold for this workload', 'Programs with large working sets, such as browsers with many tabs or launchers that start with Windows'],
      uncertainty:
        'High use is normal when Windows fills free memory with cache. The problem is the peak during the slowdown, not the number on its own. Confirm with Resource Monitor’s hard faults count if it is available.',
      actions: [
        {
          text: 'Identify the largest memory users during the slowdown. Reduce the ones the customer does not need, such as idle browser tabs or startup launchers.',
          why: 'Reducing peak use is free and reversible. It shows whether capacity is the real limit.',
          procedureId: 'task-manager-baseline',
        },
        {
          text: 'If peak use stays at or above 90% on normal work after cleanup, discuss memory capacity with the customer.',
          why: 'Adding memory is a hardware decision. It depends on the platform’s memory slots and how the customer uses the machine.',
        },
      ],
      escalate: 'If the machine cannot take more memory, or it is a laptop with soldered memory, record the peak values and explain the options to the customer.',
      verify: ['Repeat the load measurement with the same programs open.', 'Compare the peak value with the value recorded before any change.'],
    },
    'result-app': {
      type: 'result',
      id: 'result-app',
      title: 'The slowdown belongs to one program',
      why: 'When closing one program ends the problem, the program’s own add-ins, services, or installation are the most useful places to look.',
      confidence: 'medium',
      summary: 'The slowdown stops when one program closes. That points to the program itself, not the system as a whole.',
      causes: ['Add-ins, background services, or sync features inside the program', 'A damaged installation or an update that did not finish'],
      uncertainty: 'Some programs slow down only with specific files or accounts. Test again with a second, similar workload to confirm.',
      actions: [
        {
          text: 'Check the program’s add-ins, startup behavior, and background services. Update or repair the program through its own settings or its official installer.',
          why: 'The program’s own settings change its behavior without touching Windows.',
        },
      ],
      verify: ['Open and use the program in the same way and confirm the slowdown does not return.'],
    },
    'result-disk-health': {
      type: 'result',
      id: 'result-disk-health',
      title: 'Storage health should be checked',
      why: 'A slow start that is not explained by startup items can come from the drive, its connection, or its driver. Check the drive before changing software.',
      confidence: 'low',
      summary: 'Slow sign-in with few startup items points at storage. Check the drive’s health data before making software changes.',
      causes: ['Wear or errors on the drive', 'A limited or failing connection to the drive', 'A storage driver problem'],
      uncertainty: 'Health data does not reveal every fault. A Good status does not rule out a problem. Confirm with event logs.',
      actions: [
        {
          text: 'Check the drive’s health and attribute values with CrystalDiskInfo.',
          why: 'Health attributes show wear and errors that software measurements cannot.',
          procedureId: 'disk-health-check',
          safety: 'If the drive reports Caution or Bad, back up the customer’s data before any other change.',
        },
      ],
      escalate: 'If the drive reports Bad, stop further work and advise the customer to back up and replace the drive.',
      verify: ['Record the health status and attribute values with the date.', 'Repeat the sign-in measurement after any change to the drive.'],
    },
    'result-inconclusive': {
      type: 'result',
      id: 'result-inconclusive',
      title: 'Not enough evidence for a diagnosis yet',
      why: 'The measurements so far do not point to one cause. A diagnosis made now would be a guess, and changing settings on a guess adds risk without evidence.',
      confidence: 'low',
      summary: 'The measurements do not point to one cause. Gather more evidence before changing anything.',
      causes: [],
      uncertainty:
        'A complaint of slowness can come from heat, a failing component, a driver fault, or a problem that only appears at certain times. None of these show up in a single reading.',
      actions: [
        {
          text: 'Review Reliability Monitor for crashes, hangs, and driver failures on the days the slowdown started.',
          why: 'Failures in the history often explain slowdowns that live measurements miss.',
        },
        {
          text: 'Check the System and Application logs in Event Viewer for disk, driver, and application errors around the same times.',
          why: 'Repeated errors at the same time as the complaint are strong evidence.',
        },
        {
          text: 'Monitor temperatures and clock speeds under the customer’s real workload with HWiNFO64.',
          why: 'Thermal throttling reduces speed without high utilization, so a hot processor can feel slow while the usage numbers look normal.',
          procedureId: undefined,
        },
      ],
      verify: ['Write down what result would justify a change. Then gather that evidence before acting.'],
    },
  },
};
