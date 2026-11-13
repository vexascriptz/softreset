export interface ServiceTemplate {
  id: string;
  label: string;
  description: string;
  defaultIssue: string;
  intake: string[];
  suggestedProblemIds: string[];
}

export const SERVICES: ServiceTemplate[] = [
  {
    id: 'performance-tuneup',
    label: 'Performance tune-up',
    description: 'Slowness, startup time, and background load.',
    defaultIssue: 'The computer has become slow over time, especially after it starts.',
    intake: [
      'When did the slowdown start, and did anything change around then?',
      'Does it slow down right after sign-in, under load, or all the time?',
      'Which programs do you use every day, and which ones feel slow?',
      'Is it a laptop or a desktop, and is it plugged in when it slows down?',
      'Have you installed or removed software recently?',
    ],
    suggestedProblemIds: ['general-slowdown', 'slow-startup'],
  },
  {
    id: 'gaming-review',
    label: 'Gaming performance review',
    description: 'Low frame rate, stutter, and uneven frame times.',
    defaultIssue: 'Games run slower or stutter compared with before.',
    intake: [
      'Which game or games are affected, and at what settings?',
      'Is the problem a low average frame rate, stutter, or both?',
      'What are the monitor’s resolution and refresh rate, and is a frame cap or variable refresh on?',
      'Does it happen in every scene, or only in a few places?',
      'Has the graphics driver or the drive changed recently?',
    ],
    suggestedProblemIds: ['gaming-low-fps'],
  },
  {
    id: 'storage-cleanup',
    label: 'Storage cleanup',
    description: 'Low free space and storage use nobody can explain.',
    defaultIssue: 'The drive is almost full, and it is not clear what is using the space.',
    intake: [
      'Which drive is low, and how large is it?',
      'What must be kept, and is any of it backed up?',
      'Do you store media, games, or work files on this drive?',
      'Are there programs you no longer use?',
    ],
    suggestedProblemIds: ['low-disk-space'],
  },
  {
    id: 'custom',
    label: 'Custom session',
    description: 'Start from a blank case and choose workflows as you go.',
    defaultIssue: '',
    intake: ['What does the customer describe, in their own words?', 'What are they trying to do that is not working?'],
    suggestedProblemIds: [],
  },
];

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<string, ServiceTemplate>;
