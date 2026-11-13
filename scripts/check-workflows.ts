/**
 * Checks the diagnostic workflows and the library references they depend on.
 * Run with: npm run check:workflows
 *
 * Measure nodes are checked by sampling: each field is tried at its minimum, midpoint, and maximum,
 * under every combination of answers that the workflow's choice nodes can produce.
 */
import { DIAGNOSTIC_TREES } from '../src/data/diagnostics/index';
import type { Answers, DiagnosticNode, DiagnosticTree, MeasureNode, Values } from '../src/data/diagnostics/types';
import { PROBLEMS, WORKFLOW_TOOL_PLANS } from '../src/data/problems';
import { PROCEDURE_BY_ID } from '../src/data/procedures';
import { resolveTool, SOFTWARE } from '../src/data/software';

const errors: string[] = [];
const notes: string[] = [];
let sampled = 0;

function fail(message: string): void {
  errors.push(message);
}

function fieldSamples(field: MeasureNode['fields'][number]): number[] {
  const min = field.min ?? 0;
  const max = field.max ?? min + 100;
  return [min, (min + max) / 2, max];
}

function cartesian(lists: number[][]): number[][] {
  return lists.reduce<number[][]>((rows, list) => rows.flatMap((row) => list.map((v) => [...row, v])), [[]]);
}

function answerSets(tree: DiagnosticTree): Answers[] {
  const options = new Map<string, string[]>();
  for (const node of Object.values(tree.nodes) as DiagnosticNode[]) {
    if (node.type === 'choice') options.set(node.answerKey, node.options.map((o) => o.value));
  }
  let sets: Answers[] = [{}];
  for (const [key, values] of options) {
    sets = sets.flatMap((base) => values.map((value) => ({ ...base, [key]: value })));
  }
  return sets;
}

function checkTree(tree: DiagnosticTree): void {
  const label = tree.problemId;
  const nodes = tree.nodes as Record<string, DiagnosticNode>;
  const edges = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)?.add(to);
  };

  if (!nodes[tree.start]) fail(`${label}: start node "${tree.start}" does not exist`);
  const answers = answerSets(tree);

  for (const [key, node] of Object.entries(nodes)) {
    if (node.id !== key) fail(`${label}: node stored as "${key}" declares id "${node.id}"`);

    switch (node.type) {
      case 'choice':
        for (const option of node.options) {
          if (!nodes[option.next]) fail(`${label}: choice "${key}", option "${option.value}", points to missing node "${option.next}"`);
          link(key, option.next);
        }
        break;

      case 'checklist':
        if (!nodes[node.next]) fail(`${label}: checklist "${key}" points to missing node "${node.next}"`);
        link(key, node.next);
        break;

      case 'measure': {
        for (const id of node.softwareIds) {
          const resolved = resolveTool(id);
          if (!resolved) fail(`${label}: measure "${key}" refers to unknown tool "${id}"`);
          else if (resolved.kind === 'pending') notes.push(`${label}: measure "${key}" uses "${id}", whose entry is not written yet`);
        }

        for (const row of cartesian(node.fields.map(fieldSamples))) {
          const values: Values = {};
          node.fields.forEach((field, i) => {
            values[field.key] = row[i];
          });

          for (const set of answers) {
            sampled++;
            try {
              const outcome = node.interpret(values, set);
              if (!nodes[outcome.next]) fail(`${label}: measure "${key}" returned missing node "${outcome.next}" for values ${JSON.stringify(values)}`);
              link(key, outcome.next);
            } catch (err) {
              fail(`${label}: measure "${key}" threw for values ${JSON.stringify(values)}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
        break;
      }

      case 'result':
        if (node.actions.length === 0) fail(`${label}: result "${key}" has no actions`);
        for (const action of node.actions) {
          if (action.procedureId && !PROCEDURE_BY_ID[action.procedureId]) {
            fail(`${label}: result "${key}" refers to missing procedure "${action.procedureId}"`);
          }
        }
        break;
    }
  }

  const reached = new Set<string>();
  const queue = [tree.start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const next of edges.get(id) ?? []) queue.push(next);
  }
  for (const key of Object.keys(nodes)) {
    if (!reached.has(key)) fail(`${label}: node "${key}" cannot be reached from the start`);
  }
}

for (const tree of Object.values(DIAGNOSTIC_TREES)) checkTree(tree);

for (const problem of PROBLEMS) {
  if (problem.workflowId && !DIAGNOSTIC_TREES[problem.workflowId]) {
    fail(`problem "${problem.id}" names workflow "${problem.workflowId}", which has no tree`);
  }
}

for (const [workflowId, plan] of Object.entries(WORKFLOW_TOOL_PLANS)) {
  if (!DIAGNOSTIC_TREES[workflowId]) fail(`tool plan "${workflowId}" has no matching workflow`);
  const ids = [...plan.primary, ...plan.alternatives, ...plan.advanced, ...plan.unnecessary.map((u) => u.id)];
  for (const id of ids) {
    const resolved = resolveTool(id);
    if (!resolved) fail(`tool plan "${workflowId}" refers to unknown tool "${id}"`);
    else if (resolved.kind === 'pending') notes.push(`tool plan "${workflowId}" names "${id}", whose entry is not written yet`);
  }
}

for (const entry of SOFTWARE) {
  for (const id of entry.procedureIds) {
    if (!PROCEDURE_BY_ID[id]) fail(`tool "${entry.id}" lists missing procedure "${id}"`);
  }
  for (const id of entry.relatedProblems) {
    if (!PROBLEMS.some((p) => p.id === id)) fail(`tool "${entry.id}" lists unknown problem "${id}"`);
  }
  for (const id of entry.alternatives) {
    if (!resolveTool(id)) fail(`tool "${entry.id}" lists unknown alternative "${id}"`);
  }
}

for (const procedure of Object.values(PROCEDURE_BY_ID)) {
  if (resolveTool(procedure.softwareId)?.kind !== 'entry') {
    fail(`procedure "${procedure.id}" uses "${procedure.softwareId}", which has no written entry`);
  }
}

console.log(`Checked ${Object.keys(DIAGNOSTIC_TREES).length} workflows and ${sampled} sampled measurement outcomes.`);
for (const note of notes) console.log(`note: ${note}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

console.log('Every workflow reference resolves, and every node is reachable.');
