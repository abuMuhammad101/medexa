import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, PlusCircle, Sun, UserPlus } from 'lucide-react';
import { Button, IconButton, KpiCard, MiniChart, SearchField, SegmentedControl } from '../../components/ui';
import { useSimNow } from '../../engine/clock';
import { denseSeries, qualify, rangeValue, series, type KpiId } from '../../engine/kpi';
import { pipelineTotal, usePipeline } from '../../engine/pipeline';
import { latency } from '../../mocks/api';
import { CLINICIAN, DEMO_CONFIG } from '../../mocks/fixtures';
import { fmtHeaderDate, fmtInt, greeting } from '../../lib/format';
import { useDemo } from '../../store/demo';
import { useUi, type Range } from '../../store/ui';
import { PatientModal } from './PatientModal';
import { PipelineRow } from './PipelineRow';
import { PriorityQueue } from './PriorityQueue';
import { UpcomingEncounters } from './UpcomingEncounters';

export function PageHeader() {
  const range = useUi((s) => s.range);
  const setRange = useUi((s) => s.setRange);
  const theme = useUi((s) => s.theme);
  const toggleTheme = useUi((s) => s.toggleTheme);
  const setPalette = useUi((s) => s.setPalette);
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pt-6">
      <div>
        <h1 className="text-h2 font-medium text-ink dark:text-fg">Control room</h1>
        <p className="text-body text-fg-secondary">Your claims control room: agents, SLA, denials, and what needs you now.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<Range>
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ]}
        />
        <SearchField
          label="Search everything"
          placeholder="Search everything..."
          shortcut="Ctrl K"
          className="w-60"
          readOnly
          onFocus={(e) => {
            e.currentTarget.blur();
            setPalette(true);
          }}
          onClick={() => setPalette(true)}
        />
        <IconButton aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} variant="outline" onClick={toggleTheme}>
          {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </IconButton>
      </div>
    </header>
  );
}

const KPI_META: Record<KpiId, { title: (r: Range) => string; kind: 'area' | 'bar'; caption: string; fmt: (v: number) => string; unit?: string; tipFmt: (v: number) => string }> = {
  claims: { title: () => 'Claims In Flight', kind: 'area', caption: 'across all 5 agent stages', fmt: fmtInt, tipFmt: (v) => String(v) },
  firstPass: { title: () => 'First-pass approval', kind: 'bar', caption: 'vs last 7 days', fmt: (v) => `${Math.round(v)}`, unit: '%', tipFmt: (v) => `${v}%` },
  recovered: {
    title: (r) => `Recovered · ${r === 'today' ? 'today' : r === 'week' ? '7d' : '30d'}`,
    kind: 'area',
    caption: 'denials prevented + variance',
    fmt: (v) => `AED ${fmtInt(v)}`,
    tipFmt: (v) => `${v}k`,
  },
  sla: { title: () => 'SLA Breach Risk', kind: 'bar', caption: 'pre-auth windows closing <2h', fmt: (v) => `${Math.round(v)}`, tipFmt: (v) => String(v) },
};

function KpiRow({ loading }: { loading: boolean }) {
  const range = useUi((s) => s.range);
  const now = new Date(useSimNow(30000));
  const delta = useDemo((s) => s.kpiDelta);
  const threshold = useDemo((s) => s.slaThreshold);
  const counts = usePipeline((s) => s.counts);
  const navigate = useNavigate();
  const base = DEMO_CONFIG.kpiBase;
  const values: Record<KpiId, number> = {
    claims: rangeValue('claims', range, pipelineTotal(counts)),
    firstPass: rangeValue('firstPass', range, base.firstPass + delta.firstPass),
    recovered: rangeValue('recovered', range, base.recovered7d) + delta.recovered,
    sla: Math.max(0, rangeValue('sla', range, base.slaRisk) + delta.sla),
  };
  const charts = useMemo(() => {
    const out = {} as Record<KpiId, ReturnType<typeof denseSeries>>;
    (Object.keys(KPI_META) as KpiId[]).forEach((k) => (out[k] = KPI_META[k].kind === 'area' ? denseSeries(k, range, now) : { base: series(k, range, now), dense: [] }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, now.getDate(), now.getHours()]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {(Object.keys(KPI_META) as KpiId[]).map((k) => {
        const m = KPI_META[k];
        return (
          <KpiCard
            key={k}
            title={m.title(range)}
            value={values[k]}
            format={m.fmt}
            unit={m.unit}
            caption={m.caption}
            alert={k === 'sla' && values.sla >= threshold}
            loading={loading}
            onDrill={() => navigate(`/encounters?kpi=${k}`)}
            chart={
              <MiniChart
                kind={m.kind}
                base={charts[k].base}
                dense={m.kind === 'area' ? charts[k].dense : undefined}
                format={m.tipFmt}
                qualify={(v) => qualify(k, v)}
                label={m.title(range)}
              />
            }
          />
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const now = new Date(useSimNow(60000));
  const range = useUi((s) => s.range);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'patient' | 'encounter'>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    latency(300, 600).then(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [range]);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <PageHeader />
      <section className="flex flex-wrap items-end justify-between gap-4" aria-label="Greeting">
        <div>
          <p className="text-body-lg text-fg-secondary">{fmtHeaderDate(now)}</p>
          <p className="mt-1 text-display font-light text-fg">
            {greeting(now)}, {CLINICIAN.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" leading={<UserPlus size={20} aria-hidden />} onClick={() => setModal('patient')}>
            Add new Patient
          </Button>
          <Button size="lg" leading={<PlusCircle size={20} aria-hidden />} onClick={() => setModal('encounter')}>
            New Encounter
          </Button>
        </div>
      </section>

      <KpiRow loading={loading} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <UpcomingEncounters loading={loading} />
        </div>
        <div className="xl:col-span-5">
          <PriorityQueue loading={loading} />
        </div>
      </div>

      <PipelineRow />

      <PatientModal open={modal !== null} mode={modal ?? 'patient'} onClose={() => setModal(null)} />
    </div>
  );
}
