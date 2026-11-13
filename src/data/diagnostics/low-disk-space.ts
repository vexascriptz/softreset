import type { DiagnosticTree, MeasureOutcome } from './types';

const LOW_BELOW_PCT = 10;
const TIGHT_BELOW_PCT = 20;

export const lowDiskSpace: DiagnosticTree = {
  problemId: 'low-disk-space',
  title: 'Low disk space',
  intro:
    'The drive is nearly full. This workflow measures how full it is, finds out what owns the space, and only then recommends what to remove and how to do it safely.',
  estimatedMinutes: 20,
  start: 'prep',
  nodes: {
    prep: {
      type: 'checklist',
      id: 'prep',
      title: 'Before anything is deleted',
      why: 'Deletion is the one step in this workflow that cannot be undone. Settle what the customer must keep before you open any folder.',
      items: [
        'Confirm which drive is low. On most machines it is C:.',
        'Ask what the customer must keep, and whether they have a backup.',
        'Agree that folders you cannot identify are left alone until the customer decides.',
        'Confirm the customer agrees before emptying the Recycle Bin.',
      ],
      next: 'free-now',
    },
    'free-now': {
      type: 'measure',
      id: 'free-now',
      title: 'How full is the drive?',
      why: 'The percentage free decides how urgent the cleanup is. Below about 10%, Windows loses working space for updates and temporary files.',
      instructions: [
        'Open File Explorer > This PC. Right-click the drive and choose Properties.',
        'Note the total capacity and the free space, in gigabytes.',
        'Use the same drive later, so before and after values compare directly.',
      ],
      softwareIds: ['wiztree'],
      fields: [
        { key: 'total-gb', label: 'Total capacity', unit: 'GB', hint: 'Shown in drive Properties.', min: 1, max: 20000 },
        { key: 'free-gb', label: 'Free space now', unit: 'GB', hint: 'Shown in drive Properties.', min: 0, max: 20000, metric: 'free-space-gb' },
      ],
      basis:
        'Starting points: below 10% free, Windows has little room for updates and temporary files. Between 10% and 20%, cleanup is useful but not urgent. Above 20%, space is probably not the actual complaint.',
      interpret: (v): MeasureOutcome => {
        const total = v['total-gb'] ?? 0;
        const free = v['free-gb'] ?? 0;
        if (total <= 0 || free > total) {
          return { observations: [{ level: 'concern', text: 'The free space figure is larger than the total capacity. Recheck both values in drive Properties.' }], next: 'free-now', summary: 'Values need rechecking.' };
        }
        const pct = Math.round((free / total) * 100);
        if (pct >= TIGHT_BELOW_PCT) {
          return {
            observations: [{ level: 'info', text: `${pct}% of the drive is free. Space is probably not what the customer is noticing. Confirm the drive they mean.` }],
            next: 'result-not-space',
            summary: 'Space is adequate.',
          };
        }
        return {
          observations: [{ level: pct < LOW_BELOW_PCT ? 'concern' : 'notice', text: `${pct}% of the drive is free (${free} GB of ${total} GB). ${pct < LOW_BELOW_PCT ? 'Windows has little room for updates and temporary files.' : 'Cleanup will help, though it is not urgent.'}` }],
          next: 'big-consumers',
          summary: `${pct}% free.`,
        };
      },
    },
    'big-consumers': {
      type: 'choice',
      id: 'big-consumers',
      title: 'What is using the space?',
      why: 'Each kind of content has a different right answer. Games and applications are removed through uninstallers, media is moved after a copy is verified, and system folders are handled by Windows itself.',
      prompt: 'In WizTree, sorted by size, which kind of item is at the top?',
      answerKey: 'largest',
      options: [
        { label: 'Games or large applications', value: 'apps', next: 'result-space-apps' },
        { label: 'Videos, photos, or recordings', value: 'media', next: 'result-space-media' },
        { label: 'Temporary files, caches, or Windows update files', value: 'system', next: 'result-space-system' },
        { label: 'I cannot tell what the folder is', value: 'unclear', next: 'result-space-unclear' },
      ],
    },

    // ---- Results

    'result-space-apps': {
      type: 'result',
      id: 'result-space-apps',
      title: 'Large applications and games are using the space',
      why: 'Uninstalling is the cleanest way to recover this space, because the program’s own uninstaller removes its files and registrations.',
      confidence: 'high',
      summary: 'The largest items are applications or games. Removing the ones the customer no longer uses recovers the most space with the least risk.',
      causes: ['Installed games or large programs the customer no longer plays or uses'],
      uncertainty: 'A large game can still be in use. Confirm each one with the customer before uninstalling.',
      actions: [
        {
          text: 'List installed programs by size in Settings > Apps > Installed apps. Uninstall only the ones the customer confirms they do not use.',
          why: 'The program’s own uninstaller removes its files cleanly and can be reversed by reinstalling.',
          procedureId: 'disk-space-recovery',
          safety: 'Do not delete a game’s folder by hand. Use its uninstaller so saved data is handled as the game designed.',
        },
      ],
      verify: ['Measure free space again on the same drive and record it.'],
    },
    'result-space-media': {
      type: 'result',
      id: 'result-space-media',
      title: 'Personal media is using the space',
      why: 'Media is usually irreplaceable. Moving it is safer than deleting it, and a move is only complete once the copy has been checked.',
      confidence: 'high',
      summary: 'Photos, videos, or recordings are the largest items. Moving them to another drive or cloud storage keeps them while freeing this drive.',
      causes: ['Large media libraries or recordings stored on the system drive'],
      uncertainty: 'The customer decides what stays on this drive and what moves. Do not decide for them.',
      actions: [
        {
          text: 'Copy the chosen media to an external drive or the customer’s cloud storage. Open a sample of the copied files to confirm they play or display.',
          why: 'A copy that has not been opened is not a backup.',
          procedureId: 'disk-space-recovery',
          safety: 'Delete the originals only after the customer confirms the copy works and they agree to remove the originals.',
        },
      ],
      verify: ['Measure free space again, and confirm the moved files open from the new location.'],
    },
    'result-space-system': {
      type: 'result',
      id: 'result-space-system',
      title: 'Temporary files and update files are using the space',
      why: 'Windows can clean its own temporary files safely. Old Windows installations are different: removing them takes away the rollback path.',
      confidence: 'high',
      summary: 'Temporary files, caches, or Windows update files are the largest items. Storage Sense handles most of them safely.',
      causes: ['Temporary files and caches that Windows has not cleared', 'Previous Windows installation files kept after an upgrade'],
      uncertainty: 'Previous Windows installation files can be very large. Removing them is permanent for practical purposes, so confirm with the customer first.',
      actions: [
        {
          text: 'Run Storage Sense once now for temporary files and the Recycle Bin, with the customer’s agreement.',
          why: 'It removes what Windows itself considers safe to remove.',
          procedureId: 'disk-space-recovery',
        },
        {
          text: 'If previous Windows versions are listed, ask the customer before removing them.',
          why: 'Removing them ends the ability to roll back to the earlier version.',
          safety: 'Do not remove previous Windows versions without explicit agreement.',
        },
      ],
      verify: ['Measure free space again, and record which items Storage Sense removed.'],
    },
    'result-space-unclear': {
      type: 'result',
      id: 'result-space-unclear',
      title: 'Keep scanning before deleting anything',
      why: 'An unidentified folder is not junk by default. Deleting something you cannot explain is the most common cause of avoidable data loss in cleanup work.',
      confidence: 'low',
      summary: 'The largest folder cannot be identified yet. Find out what it is before taking any action.',
      causes: [],
      uncertainty: 'Large folders often belong to games, projects, virtual machines, or the operating system. None of these are safe to delete by name alone.',
      actions: [
        {
          text: 'In WizTree, expand the largest folder and then its largest child until you reach the files. Note the file types and the program that creates them.',
          why: 'The file types usually reveal the owner: an application, a game, a sync client, or the customer’s own data.',
          procedureId: 'disk-space-recovery',
        },
        {
          text: 'Ask the customer whether they recognize the folder before any action is taken.',
          why: 'The customer often knows exactly what the folder holds.',
        },
      ],
      verify: ['Return to this workflow once the largest folder has an identified owner.'],
    },
    'result-not-space': {
      type: 'result',
      id: 'result-not-space',
      title: 'Free space is not the constraint',
      why: 'Sending a technician to clean a drive that has space wastes time and risks deleting things for no benefit.',
      confidence: 'medium',
      summary: 'The drive has more than 20% free. The complaint probably has a different cause. Confirm which drive the customer means.',
      causes: ['A different drive is the one that is full', 'The complaint is about speed, not space'],
      uncertainty: 'A disk that is slow for other reasons can feel like a space problem. Use the slowdown or storage-health workflows next.',
      actions: [
        {
          text: 'Confirm the drive the customer means, then restart the workflow on the correct drive or use the slowdown workflow.',
          why: 'Working on the right problem avoids unnecessary changes.',
        },
      ],
      verify: ['Record which drive the customer meant in the session.'],
    },
  },
};
