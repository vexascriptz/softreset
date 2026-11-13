import { Link } from 'react-router-dom';
import { Badge, PageHeader, Panel } from '../components/ui';

export type PlannedId = 'knowledge' | 'checklists' | 'notes' | 'training';

interface PlannedInfo {
  title: string;
  summary: string;
  today: string;
  contents: string[];
}

const PLANNED: Record<PlannedId, PlannedInfo> = {
  knowledge: {
    title: 'Troubleshooting knowledge base',
    summary: 'Articles organized by symptom. Each one points to the diagnostic workflow, the procedure, and the check that shows whether a fix worked.',
    today: 'The diagnostic assistant already covers general slowdowns, low frame rates, and low disk space. The knowledge base will hold the reference material behind those steps.',
    contents: [
      'An entry for each symptom the customer describes',
      'Likely causes, and the measurement that rules each one out',
      'Links to the matching procedure and Windows setting',
    ],
  },
  checklists: {
    title: 'Maintenance checklists',
    summary: 'Repeatable checklists for each service type. Items link to procedures and are recorded in the session as they are completed.',
    today: 'Procedures already save their own checks to the session. A checklist that combines several procedures for one service is not built yet.',
    contents: ['A checklist for each service type', 'Items that link to the matching procedure', 'Completed checklists carried into the customer report'],
  },
  notes: {
    title: 'Technician notes',
    summary: 'Working notes that span customers and sessions. Kept apart from the customer report.',
    today: 'Each session already has its own notes panel and timeline. Notes that span several sessions are not built yet.',
    contents: [
      'Notes across customers and sessions',
      'Search across all notes',
      'Notes left out of the customer report unless added on purpose',
    ],
  },
  training: {
    title: 'Training mode',
    summary: 'A practice mode with sample cases, so a new technician can run a workflow without writing to real customer records.',
    today: 'There is no practice mode yet. To try a workflow, use a test customer and session, then delete them afterwards.',
    contents: [
      'Sample cases with known answers',
      'Practice runs that never write to customer records',
      'A comparison of the path taken with the expected path',
    ],
  },
};

export default function Planned({ id }: { id: PlannedId }) {
  const info = PLANNED[id];
  return (
    <>
      <PageHeader title={info.title} description={info.summary} actions={<Badge tone="neutral">Planned</Badge>} />

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Not built yet">
          <p className="max-w-[68ch] text-sm text-ink">{info.today}</p>
        </Panel>
        <Panel title="What it will contain">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            {info.contents.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="mt-6 text-sm text-muted">
        In the meantime, you can <Link to="/diagnose" className="font-medium text-accent hover:underline">run a diagnostic workflow</Link> or{' '}
        <Link to="/library" className="font-medium text-accent hover:underline">search the software library</Link>.
      </p>
    </>
  );
}
