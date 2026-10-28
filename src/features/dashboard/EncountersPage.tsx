import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button, Card, EmptyState, EncounterRow, SearchField, Select } from '../../components/ui';
import { DEPARTMENTS, PAYERS } from '../../mocks/fixtures';
import { useDemo } from '../../store/demo';
import type { Department, NphiesStatus, Payer } from '../../store/types';
import { sortEncounters, useEncounterActions } from './encounterActions';
import { SortMenu } from './UpcomingEncounters';

const KPI_TITLES: Record<string, string> = {
  claims: 'Claims in flight',
  firstPass: 'First-pass approvals',
  recovered: 'Recovered claims',
  sla: 'SLA breach risk',
};

export function EncountersPage() {
  const [params] = useSearchParams();
  const kpi = params.get('kpi');
  const encounters = useDemo((s) => s.encounters);
  const patients = useDemo((s) => s.patients);
  const sort = useDemo((s) => s.sort);
  const setSort = useDemo((s) => s.setSort);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<NphiesStatus | 'all'>(kpi === 'sla' ? 'queued' : 'all');
  const [payer, setPayer] = useState<Payer | 'all'>('all');
  const [dept, setDept] = useState<Department | 'all'>('all');
  const { open, menu, dialogs } = useEncounterActions();

  const list = sortEncounters(
    encounters.filter((e) => {
      const p = patients.find((x) => x.id === e.patientId);
      if (status !== 'all' && e.nphies !== status) return false;
      if (payer !== 'all' && p?.payer !== payer) return false;
      if (dept !== 'all' && e.department !== dept) return false;
      if (q && !`${p?.name} ${e.refId}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }),
    patients,
    sort,
  );

  const clear = () => {
    setQ('');
    setStatus('all');
    setPayer('all');
    setDept('all');
  };

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-6 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Back to Control room" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-primary-subtle focus-visible:outline-none focus-visible:shadow-focus">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-h1 font-medium">{kpi ? KPI_TITLES[kpi] ?? 'Encounters' : 'All upcoming encounters'}</h1>
          <p className="text-body text-fg-secondary">{list.length} shown · filter, sort and open any encounter</p>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 px-6 pt-5">
          <SearchField label="Search patient or Ref ID" placeholder="Search patient or Ref ID" value={q} onChange={(e) => setQ(e.target.value)} className="w-full md:w-80" />
          <Select<NphiesStatus | 'all'>
            size="sm"
            label="NPHIES status"
            value={status}
            onChange={setStatus}
            className="w-40"
            options={[
              { value: 'all', label: 'All' },
              { value: 'cleared', label: 'Cleared' },
              { value: 'queued', label: 'Queued' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <Select<Payer | 'all'> size="sm" label="Payer" value={payer} onChange={setPayer} className="w-40" options={[{ value: 'all', label: 'All' }, ...PAYERS.map((p) => ({ value: p.id, label: p.label }))]} />
          <Select<Department | 'all'> size="sm" label="Department" value={dept} onChange={setDept} className="w-60" options={[{ value: 'all', label: 'All' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]} />
          <div className="ml-auto">
            <SortMenu value={sort} onChange={setSort} />
          </div>
        </div>
        <div className="mt-4 border-t border-line" />
        {list.length === 0 ? (
          <EmptyState icon={<SearchX size={24} aria-hidden />} title="No encounters match" body="Try clearing a filter." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
        ) : (
          <ul aria-label="Encounters">
            {list.map((e) => (
              <EncounterRow
                key={e.id}
                name={patients.find((p) => p.id === e.patientId)?.name ?? 'Unknown'}
                nphies={e.nphies}
                scheduledAt={e.scheduledAt}
                refId={e.refId}
                menu={menu(e)}
                onOpen={() => open(e)}
              />
            ))}
          </ul>
        )}
      </Card>
      {dialogs}
    </div>
  );
}
