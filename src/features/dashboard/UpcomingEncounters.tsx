import { useNavigate } from 'react-router-dom';
import { CalendarX2, ChevronDown, X } from 'lucide-react';
import { Button, Card, EmptyState, Menu, Skeleton, EncounterRow, StatusPill } from '../../components/ui';
import { STAGES, usePipeline } from '../../engine/pipeline';
import { useDemo, type SortKey } from '../../store/demo';
import { SORT_LABEL, sortEncounters, useEncounterActions } from './encounterActions';

export function SortMenu({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <Menu
      items={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ label: SORT_LABEL[k], onSelect: () => onChange(k) }))}
      trigger={
        <button className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body-lg text-fg-secondary hover:bg-primary-subtle focus-visible:outline-none focus-visible:shadow-focus">
          ranked by <span className="text-primary">{SORT_LABEL[value]}</span>
          <ChevronDown size={20} className="text-fg" aria-hidden />
        </button>
      }
    />
  );
}

export function UpcomingEncounters({ loading }: { loading: boolean }) {
  const navigate = useNavigate();
  const encounters = useDemo((s) => s.encounters);
  const patients = useDemo((s) => s.patients);
  const sort = useDemo((s) => s.sort);
  const setSort = useDemo((s) => s.setSort);
  const filter = usePipeline((s) => s.filter);
  const setFilter = usePipeline((s) => s.setFilter);
  const { open, menu, dialogs } = useEncounterActions();

  const upcoming = encounters.filter((e) => !filter || e.stage === filter);
  const sorted = sortEncounters(upcoming, patients, sort);

  return (
    <Card
      className="flex h-full flex-col overflow-hidden"
      title={
        <h2 className="flex items-center gap-2 text-h3 font-medium text-ink dark:text-fg">
          Upcoming Encounters
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-fg-tertiary px-1.5 text-caption text-fg-on-dark tabular" aria-label={`${upcoming.length} encounters`}>
            {upcoming.length}
          </span>
        </h2>
      }
      actions={<SortMenu value={sort} onChange={setSort} />}
    >
      {filter && (
        <div className="px-6 pt-2">
          <StatusPill tone="indigo" size="sm">
            Stage: {STAGES.find((s) => s.id === filter)?.label}
            <button aria-label="Clear stage filter" onClick={() => setFilter(null)} className="rounded-full hover:text-fg focus-visible:outline-none focus-visible:shadow-focus">
              <X size={12} />
            </button>
          </StatusPill>
        </div>
      )}
      <div className="mt-4 border-t border-line" />
      {loading ? (
        <div className="flex flex-col gap-4 px-6 py-4" aria-busy="true" aria-label="Loading encounters">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-5 w-60" />
              <Skeleton className="h-4 w-80" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={24} aria-hidden />}
          title={filter ? 'No encounters in this stage' : 'No upcoming encounters'}
          body={filter ? 'Clear the stage filter to see every encounter.' : 'Add a patient to schedule a new encounter.'}
          action={filter ? <Button variant="outline" onClick={() => setFilter(null)}>Clear filter</Button> : undefined}
        />
      ) : (
        <ul className="thin-scroll max-h-80 flex-1 overflow-y-auto" aria-label="Upcoming encounters">
          {sorted.map((e) => {
            const p = patients.find((x) => x.id === e.patientId);
            return (
              <EncounterRow
                key={e.id}
                name={p?.name ?? 'Unknown patient'}
                nphies={e.nphies}
                scheduledAt={e.scheduledAt}
                refId={e.refId}
                menu={menu(e)}
                onOpen={() => open(e)}
                badge={
                  e.status === 'in_review' ? (
                    <StatusPill tone="indigo" size="sm">In review</StatusPill>
                  ) : e.status === 'cleared' ? (
                    <StatusPill tone="success" size="sm" dot>Claim submitted</StatusPill>
                  ) : undefined
                }
              />
            );
          })}
        </ul>
      )}
      <div className="p-3">
        <Button variant="tinted" className="w-full rounded-md" onClick={() => navigate('/encounters')}>
          See All Upcoming Encounters
        </Button>
      </div>
      {dialogs}
    </Card>
  );
}
