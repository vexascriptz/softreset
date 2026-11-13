import type { DiagnosticTree } from './types';
import { generalSlowdown } from './general-slowdown';
import { gamingLowFps } from './gaming-low-fps';
import { lowDiskSpace } from './low-disk-space';

export const DIAGNOSTIC_TREES: Record<string, DiagnosticTree> = {
  [generalSlowdown.problemId]: generalSlowdown,
  [gamingLowFps.problemId]: gamingLowFps,
  [lowDiskSpace.problemId]: lowDiskSpace,
};

export function getTree(workflowId: string | undefined): DiagnosticTree | undefined {
  return workflowId ? DIAGNOSTIC_TREES[workflowId] : undefined;
}

export * from './types';
