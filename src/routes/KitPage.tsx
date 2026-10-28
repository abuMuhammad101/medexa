/**
 * /kit: every component in every listed state. Hover/pressed/focus states are
 * shown live (interact) and as forced snapshots where CSS allows.
 */
import { useState, type ReactNode } from 'react';
import { Check, Inbox, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  Button,
  Card,
  CodeChip,
  Confirm,
  DrawerPanel,
  EmptyState,
  EncounterRow,
  ErrorState,
  IconButton,
  KpiCard,
  MeterBar,
  MeterRow,
  MiniChart,
  Modal,
  ProgressRing,
  SearchField,
  SegmentedControl,
  Select,
  Skeleton,
  StatusChip,
  StatusPill,
  StepProgress,
  SuggestionRow,
  Tab,
  TextField,
  Textarea,
  TimelineStepper,
  Tooltip,
} from '../components/ui';
import { NavItem } from '../components/ui/Nav';
import { denseSeries, series } from '../engine/kpi';
import { toast } from '../store/toast';
import { Home } from 'lucide-react';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-surface p-6 shadow-xs">
      <h2 className="mb-4 text-h3 font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
      <span className="w-30 shrink-0 text-caption text-fg-tertiary">{label}</span>
      {children}
    </div>
  );
}

export function KitPage() {
  const now = new Date();
  const [seg, setSeg] = useState<'today' | 'week' | 'month'>('week');
  const [sel, setSel] = useState<'a' | 'b' | ''>('');
  const [sugg, setSugg] = useState<'pending' | 'kept' | 'dismissed'>('pending');
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState('Patient tolerated exercise well.');
  const d = denseSeries('claims', 'week', now);

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-6 pt-6">
      <header>
        <h1 className="text-h1 font-medium">UI kit</h1>
        <p className="text-body text-fg-secondary">Every variant and state. Tab through to see focus rings; hover and press to see interaction states.</p>
      </header>

      <Block title="Button">
        {(['primary', 'ink', 'outline'] as const).map((v) => (
          <Row key={v} label={v}>
            <Button variant={v}>Default</Button>
            <Button variant={v} className="shadow-focus">Focus</Button>
            <Button variant={v} className="scale-95">Pressed</Button>
            <Button variant={v} disabled>Disabled</Button>
            <Button variant={v} loading>Loading</Button>
            <Button variant={v} leading={<Plus size={16} aria-hidden />}>With icon</Button>
          </Row>
        ))}
      </Block>

      <Block title="IconButton">
        {(['ghost', 'tinted', 'ink', 'primary'] as const).map((v) => (
          <Row key={v} label={v}>
            <IconButton aria-label="Add" variant={v}><Plus size={20} /></IconButton>
            <IconButton aria-label="Add (focus)" variant={v} className="shadow-focus"><Plus size={20} /></IconButton>
            <IconButton aria-label="Add (disabled)" variant={v} disabled><Plus size={20} /></IconButton>
            <IconButton aria-label="Add (loading)" variant={v} loading><Plus size={20} /></IconButton>
          </Row>
        ))}
      </Block>

      <Block title="StatusPill, StatusChip, CodeChip">
        <Row label="StatusPill">
          {(['outline', 'ink', 'success', 'warning', 'error'] as const).map((t) => (
            <StatusPill key={t} tone={t}>{t}</StatusPill>
          ))}
          {(['outline', 'ink', 'success', 'warning', 'error'] as const).map((t) => (
            <StatusPill key={`d${t}`} tone={t} dot>{t}</StatusPill>
          ))}
        </Row>
        <Row label="StatusChip">
          <StatusChip kind="Denial" refId="DN-88213" />
          <StatusChip kind="Pre-Auth" refId="PA-77102" />
          <StatusChip kind="Appeal" refId="AP-33410" />
        </Row>
        <Row label="CodeChip (click)">
          <CodeChip code="9.3.42" />
          <CodeChip code="CCHI-BS" variant="outlined" />
        </Row>
      </Block>

      <Block title="Tab, NavItem, SegmentedControl, Tooltip">
        <Row label="Tab">
          <div role="tablist" className="flex gap-2">
            <Tab active status="reviewed">Active reviewed</Tab>
            <Tab status="gaps">Has gaps</Tab>
            <Tab>Default</Tab>
            <Tab className="shadow-focus">Focus</Tab>
            <Tab disabled>Disabled</Tab>
          </div>
        </Row>
        <Row label="NavItem">
          <NavItem label="Home (collapsed shows tooltip)" onClick={() => undefined} icon={<Home size={24} />} />
        </Row>
        <Row label="Segmented">
          <SegmentedControl label="Range" value={seg} onChange={setSeg} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }]} />
        </Row>
        <Row label="Tooltip">
          <Tooltip content="Tooltip content"><Button variant="outline">Hover or focus me</Button></Tooltip>
        </Row>
      </Block>

      <Block title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Light card" actions={<IconButton aria-label="More" size="sm"><Plus size={16} /></IconButton>}><p className="p-6 text-body">Body</p></Card>
          <Card tone="dark" title="Dark card"><p className="p-6 text-body">Stays dark in both themes.</p></Card>
          <Card ai title="AI card"><p className="p-6 text-body">Carries the AI glow ring.</p></Card>
        </div>
      </Block>

      <Block title="Fields">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Default" placeholder="John Doe" />
          <TextField label="Filled" defaultValue="Samuel Thompson" />
          <TextField label="Error" defaultValue="12" error="Enter the full name." />
          <TextField label="Disabled" disabled defaultValue="Locked" />
          <Textarea label="Textarea with count" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
          <div className="flex flex-col gap-4">
            <SearchField label="Search" placeholder="Search everything..." shortcut="Ctrl K" />
            <Select label="Select" value={sel} onChange={setSel} options={[{ value: 'a', label: 'Daman' }, { value: 'b', label: 'NAS' }]} />
            <Select label="Select error" value="" onChange={() => undefined} error="Choose a payer." options={[{ value: 'a', label: 'Daman' }]} />
            <Select label="Select disabled" value="" disabled onChange={() => undefined} options={[{ value: 'a', label: 'Daman' }]} />
          </div>
        </div>
      </Block>

      <Block title="SuggestionRow">
        <Row label={sugg}>
          <div className="w-full max-w-xl">
            <SuggestionRow
              tag="Billing"
              text="Code 9.3.42 (Therapeutic Exercise) matching CCHI-BS procedure has been identified"
              state={sugg}
              onKeep={() => setSugg(sugg === 'kept' ? 'pending' : 'kept')}
              onDismiss={() => setSugg('dismissed')}
              onUndo={() => setSugg('pending')}
            />
          </div>
        </Row>
        <Row label="kept">
          <div className="w-full max-w-xl"><SuggestionRow tag="Detected" text="Persistent fatigue for three weeks." state="kept" onKeep={() => undefined} onDismiss={() => undefined} /></div>
        </Row>
      </Block>

      <Block title="KpiCard, ChartCard">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Default" value={1284} format={(v) => Math.round(v).toLocaleString()} caption="area chart" chart={<MiniChart kind="area" base={d.base} dense={d.dense} format={String} qualify={() => 'Good'} label="Demo" />} />
          <KpiCard title="Alert" value={17} alert format={(v) => String(Math.round(v))} caption="bar chart" chart={<MiniChart kind="bar" base={series('sla', 'week', now)} format={String} qualify={() => 'Low'} label="Demo bars" />} />
          <KpiCard title="Loading" value={0} loading format={String} caption="" />
        </div>
      </Block>

      <Block title="EncounterRow">
        <ul className="overflow-hidden rounded-lg border border-line">
          <EncounterRow name="Samuel Thompson" nphies="cleared" scheduledAt={now.toISOString()} refId="PA-2026-00848610" menu={[{ label: 'Open', onSelect: () => undefined }]} onOpen={() => toast({ tone: 'info', title: 'Open' })} />
          <EncounterRow name="Sarah Williams" nphies="queued" scheduledAt={now.toISOString()} refId="PA-2026-00851368" menu={[{ label: 'Open', onSelect: () => undefined }]} onOpen={() => undefined} />
          <EncounterRow name="Ahmed Abdullah" nphies="inactive" scheduledAt={now.toISOString()} refId="PA-2026-00852747" menu={[{ label: 'Open', onSelect: () => undefined }]} onOpen={() => undefined} />
        </ul>
      </Block>

      <Block title="MeterBar, MeterRow, ProgressRing">
        <div className="grid gap-4 md:grid-cols-2">
          <MeterRow label="DX Support Confidence" value={94.4} tone="success" />
          <MeterRow label="Claims Readiness" value={78.4} tone="primary" />
          <MeterBar value={40} tone="warning" label="Warning" />
          <div className="flex gap-4">
            <ProgressRing value={98} label="Ring" />
            <ProgressRing value={72} tone="warning" label="Ring" />
            <ProgressRing value={40} tone="error" label="Ring" />
          </div>
        </div>
      </Block>

      <Block title="Timeline stepper">
        <TimelineStepper steps={[{ title: 'SOAP Notes', description: 'Validate.' }, { title: 'Billing', description: 'Codes.' }, { title: 'Summary', description: 'Share.' }]} active={1} visited={[true, true, false]} onSelect={() => undefined} />
        <StepProgress active={1} total={3} visited={[true, true, false]} />
      </Block>

      <Block title="Modal, Drawer, Confirm, Toast">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="outline" onClick={() => setDrawer(true)}>Open drawer</Button>
          <Button variant="outline" onClick={() => setConfirm(true)}>Open confirm</Button>
          {(['info', 'success', 'warning', 'error'] as const).map((t) => (
            <Button key={t} variant="outline" onClick={() => toast({ tone: t, title: `${t} toast`, body: 'Queue holds 3.', action: t === 'info' ? { label: 'Undo', onClick: () => undefined } : undefined })}>
              {t} toast
            </Button>
          ))}
        </div>
        <Modal open={modal} onRequestClose={() => setModal(false)} title="Modal" description="Focus trap, Esc, scroll lock, focus return." footer={<Button onClick={() => setModal(false)} leading={<Check size={16} aria-hidden />}>Done</Button>}>
          <TextField label="Focus is trapped here" />
        </Modal>
        <DrawerPanel open={drawer} onClose={() => setDrawer(false)} title="Drawer"><p>Right-side drawer panel.</p></DrawerPanel>
        <Confirm open={confirm} title="Confirm?" body="Destructive confirm." tone="danger" confirmLabel="Delete" onCancel={() => setConfirm(false)} onConfirm={() => setConfirm(false)} />
      </Block>

      <Block title="Skeleton, EmptyState, ErrorState">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-20 w-full" /></div>
          <EmptyState icon={<Inbox size={24} aria-hidden />} title="Nothing here" body="One clear action." action={<Button variant="outline" leading={<Sparkles size={16} aria-hidden />}>Action</Button>} />
          <ErrorState title="Could not load" body="Network error." onRetry={() => toast({ tone: 'info', title: 'Retrying' })} />
        </div>
      </Block>

      <Block title="Icon sizes (Lucide 16 / 20 / 24)">
        <div className="flex items-center gap-4 text-fg">
          <Trash2 size={16} aria-hidden /><Trash2 size={20} aria-hidden /><Trash2 size={24} aria-hidden /><X size={24} aria-hidden />
        </div>
      </Block>
    </div>
  );
}
