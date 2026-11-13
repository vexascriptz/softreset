export type ProblemCategory = 'Storage' | 'Performance' | 'Gaming' | 'Stability' | 'Other';

export interface ProblemDef {
  id: string;
  title: string;
  category: ProblemCategory;
  /** How a customer might describe it. Shown on the dashboard as an entry point. */
  customerWords?: string;
  /** The diagnostic workflow that handles this problem. Problems without one are listed as planned. */
  workflowId?: string;
}

export interface ToolPlan {
  reasoning: string;
  primary: string[];
  alternatives: string[];
  advanced: string[];
  unnecessary: { id: string; reason: string }[];
}

export const PROBLEMS: ProblemDef[] = [
  { id: 'low-disk-space', title: 'Low disk space', category: 'Storage', customerWords: 'The drive is almost full', workflowId: 'low-disk-space' },
  { id: 'unexplained-storage-usage', title: 'Unexplained storage usage', category: 'Storage' },
  { id: 'duplicate-files', title: 'Duplicate files', category: 'Storage' },
  { id: 'unnecessary-applications', title: 'Unnecessary applications', category: 'Storage' },
  { id: 'slow-storage', title: 'Slow storage', category: 'Storage' },
  { id: 'missing-drive', title: 'Missing drive', category: 'Storage' },
  { id: 'suspected-drive-failure', title: 'Suspected drive failure', category: 'Storage' },
  { id: 'file-organization', title: 'File organization problems', category: 'Storage' },

  { id: 'slow-startup', title: 'Slow Windows startup', category: 'Performance', workflowId: 'general-slowdown' },
  { id: 'general-slowdown', title: 'General system sluggishness', category: 'Performance', customerWords: 'My computer has gotten really slow', workflowId: 'general-slowdown' },
  { id: 'high-cpu', title: 'High CPU usage', category: 'Performance' },
  { id: 'high-ram', title: 'High RAM usage', category: 'Performance' },
  { id: 'high-disk-activity', title: 'High disk activity', category: 'Performance' },
  { id: 'background-processes', title: 'Background process issues', category: 'Performance' },
  { id: 'thermal-throttling', title: 'Thermal throttling', category: 'Performance' },
  { id: 'unexplained-degradation', title: 'Unexplained performance degradation', category: 'Performance' },

  { id: 'gaming-low-fps', title: 'Low FPS', category: 'Gaming', customerWords: 'Games run at a low frame rate', workflowId: 'gaming-low-fps' },
  { id: 'frame-time-spikes', title: 'Frame-time spikes', category: 'Gaming', workflowId: 'gaming-low-fps' },
  { id: 'stuttering', title: 'Stuttering', category: 'Gaming', workflowId: 'gaming-low-fps' },
  { id: 'gpu-underutilization', title: 'GPU underutilization', category: 'Gaming', workflowId: 'gaming-low-fps' },
  { id: 'cpu-bottleneck', title: 'CPU bottlenecks', category: 'Gaming', workflowId: 'gaming-low-fps' },
  { id: 'game-crashes', title: 'Game crashes', category: 'Gaming' },
  { id: 'inconsistent-performance', title: 'Inconsistent performance', category: 'Gaming' },

  { id: 'app-crashes', title: 'Application crashes', category: 'Stability' },
  { id: 'windows-freezes', title: 'Windows freezes', category: 'Stability' },
  { id: 'blue-screen', title: 'Blue-screen errors', category: 'Stability' },
  { id: 'windows-update', title: 'Windows Update problems', category: 'Stability' },
  { id: 'system-file-corruption', title: 'System file corruption', category: 'Stability' },
  { id: 'memory-instability', title: 'Suspected memory instability', category: 'Stability' },

  { id: 'audio-latency', title: 'Audio latency', category: 'Other' },
  { id: 'network-latency', title: 'Network latency', category: 'Other' },
  { id: 'battery-performance', title: 'Battery performance', category: 'Other' },
  { id: 'driver-problems', title: 'Driver problems', category: 'Other' },
  { id: 'general-maintenance', title: 'General system maintenance', category: 'Other' },
];

export const PROBLEM_CATEGORIES: ProblemCategory[] = ['Storage', 'Performance', 'Gaming', 'Stability', 'Other'];

export const PROBLEM_BY_ID = Object.fromEntries(PROBLEMS.map((p) => [p.id, p])) as Record<string, ProblemDef>;

/** Tool recommendations per workflow. Each one says why the other tools are not needed. */
export const WORKFLOW_TOOL_PLANS: Record<string, ToolPlan> = {
  'general-slowdown': {
    reasoning:
      'Startup and background load are the usual causes, and Task Manager already measures both. Autoruns is added only when Task Manager’s list is not enough to name the entries.',
    primary: ['task-manager'],
    alternatives: ['resource-monitor'],
    advanced: ['autoruns', 'hwinfo64', 'reliability-monitor'],
    unnecessary: [
      { id: 'bleachbit', reason: 'Cleaning files does not fix a slowdown caused by startup or background work. Use it only after storage is shown to be the problem.' },
      { id: 'wiztree', reason: 'Disk space is not the complaint here. Use it only if the drive is nearly full.' },
    ],
  },
  'gaming-low-fps': {
    reasoning:
      'Frame data separates a low average from stutter, and frame capture is the only way to measure that. HWiNFO64 supplies the GPU and CPU load during the same capture.',
    primary: ['capframex'],
    alternatives: ['hwinfo64'],
    advanced: ['presentmon', 'msi-afterburner'],
    unnecessary: [
      { id: 'bleachbit', reason: 'Not related to frame rate.' },
      { id: 'autoruns', reason: 'Only useful after frame data points to background load. Start there, not with startup entries.' },
      { id: 'cpu-z', reason: 'Hardware identification is needed for the report, not for the diagnosis.' },
    ],
  },
  'low-disk-space': {
    reasoning:
      'WizTree shows which folders own the space. Deletion is then done through the program that owns the data, or through Windows’ own cleanup.',
    primary: ['wiztree'],
    alternatives: ['storage-sense', 'treesize-free'],
    advanced: ['bleachbit', 'windows-disk-management'],
    unnecessary: [
      { id: 'crystaldiskinfo', reason: 'Drive health is not the question when the only problem is free space.' },
      { id: 'hwinfo64', reason: 'No sensor data is needed to find space.' },
    ],
  },
};

export function planFor(problem: ProblemDef): ToolPlan | undefined {
  return problem.workflowId ? WORKFLOW_TOOL_PLANS[problem.workflowId] : undefined;
}
