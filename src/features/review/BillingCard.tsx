import { useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronRight, CircleX, Link2, Pencil, Plus, Sparkles, Trash2, Unlink, Wand2 } from 'lucide-react';
import { Button, CodeChip, DrawerPanel, EmptyState, IconButton, MeterRow, StatusPill, Tooltip } from '../../components/ui';
import { CODES, type CodeDef } from '../../mocks/fixtures';
import { cn, uid } from '../../lib/format';
import type { Claim, ClaimLine, RuleFix, RuleResult } from '../../store/types';
import { toast } from '../../store/toast';
import { Evidence } from './Evidence';

const matchMeta = {
  matched: { icon: <Link2 size={16} aria-hidden />, label: 'Matched', cls: 'text-success-text' },
  review: { icon: <AlertCircle size={16} aria-hidden />, label: 'Needs review', cls: 'text-warning-text' },
  none: { icon: <Unlink size={16} aria-hidden />, label: 'No match', cls: 'text-error-text' },
};

function CodePicker({ kind, onPick, onCancel, initial = '' }: { kind?: 'dx' | 'px'; onPick: (c: CodeDef) => void; onCancel: () => void; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [sel, setSel] = useState(0);
  const matches = CODES.filter((c) => (!kind || c.kind === kind) && `${c.code} ${c.description}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <div className="relative">
      <input
        autoFocus
        role="combobox"
        aria-expanded="true"
        aria-controls="code-options"
        aria-label="Search codes"
        aria-activedescendant={matches[sel] ? `code-${matches[sel].code}` : undefined}
        placeholder="Type a code or description"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'ArrowDown') setSel((s) => Math.min(matches.length - 1, s + 1));
          else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
          else if (e.key === 'Enter' && matches[sel]) onPick(matches[sel]);
          else if (e.key === 'Escape') onCancel();
        }}
        className="h-10 w-full rounded-md border border-primary bg-surface px-3 text-body shadow-focus outline-none"
      />
      <ul id="code-options" role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-modal">
        {matches.length === 0 && <li className="px-3 py-2 text-body-sm text-fg-secondary">No codes match. Codes are illustrative.</li>}
        {matches.map((c, i) => (
          <li
            key={c.code}
            id={`code-${c.code}`}
            role="option"
            aria-selected={i === sel}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(c);
            }}
            className={cn('flex cursor-pointer items-center gap-2 px-3 py-2 text-body-sm', i === sel && 'bg-primary-subtle')}
          >
            <span className="rounded-xs bg-ink px-1.5 text-caption text-fg-on-dark tabular">{c.code}</span>
            <span className="flex-1 truncate">{c.description}</span>
            <span className="text-caption text-fg-tertiary">{c.system}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DenialDrawer({
  open,
  onClose,
  items,
  onApply,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  items: RuleResult[];
  onApply: (fix: RuleFix, title: string) => void;
  readOnly: boolean;
}) {
  return (
    <DrawerPanel open={open} onClose={onClose} title="Active Denial Loop" subtitle={items.length ? `${items.length} item${items.length > 1 ? 's' : ''} likely to cause a denial` : 'No active denials'}>
      {items.length === 0 ? (
        <EmptyState icon={<Check size={24} aria-hidden />} title="No active denials" body="Every coded line is supported and documented. Claims Readiness is up to date." />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg border border-line p-4">
              <p className="flex items-start gap-2 text-body-lg font-medium text-fg">
                <CircleX size={20} className={cn('mt-0.5 shrink-0', it.severity === 'error' ? 'text-error' : 'text-warning')} aria-hidden />
                {it.title}
              </p>
              <p className="mt-2 text-body text-fg-secondary">
                <span className="font-medium text-fg">Likely denial reason: </span>
                {it.reason}
              </p>
              <p className="mt-1 text-body text-fg-secondary">
                <span className="font-medium text-fg">Evidence: </span>
                {it.evidence}
              </p>
              {it.fix && (
                <Button className="mt-3" size="sm" disabled={readOnly} onClick={() => onApply(it.fix!, it.title)} leading={<Wand2 size={16} aria-hidden />}>
                  Apply fix: {it.fix.label}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </DrawerPanel>
  );
}

export function BillingCard({
  claim,
  results,
  readiness,
  dxConfidence,
  canEdit,
  readOnlyReason,
  active,
  onClaim,
  onOpenDenials,
}: {
  claim: Claim;
  results: RuleResult[];
  readiness: number;
  dxConfidence: number;
  canEdit: boolean;
  readOnlyReason: string;
  active: boolean;
  onClaim: (c: Claim) => void;
  onOpenDenials: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const denials = results.filter((r) => r.severity !== 'info');
  const lines = useMemo(() => [...claim.lines].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'dx' ? -1 : 1)), [claim.lines]);
  const lineIssue = (l: ClaimLine) => results.find((r) => r.id.endsWith(`:${l.id}`) || r.id.includes(`:${l.code}`));

  const remove = (l: ClaimLine) => {
    const prev = claim;
    onClaim({ ...claim, lines: claim.lines.filter((x) => x.id !== l.id).map((x) => ({ ...x, linkedDxIds: x.linkedDxIds.filter((d) => d !== l.id) })) });
    toast({ tone: 'info', title: `Removed ${l.code}`, body: l.description, durationMs: 5000, action: { label: 'Undo', onClick: () => onClaim(prev) } });
  };

  const change = (l: ClaimLine, c: CodeDef) => {
    onClaim({ ...claim, lines: claim.lines.map((x) => (x.id === l.id ? { ...x, code: c.code, description: c.description, system: c.system, amountAed: c.amountAed, match: 'matched' } : x)) });
    setChanging(null);
  };

  const add = (c: CodeDef) => {
    const firstDx = claim.lines.find((l) => l.kind === 'dx');
    const line: ClaimLine = {
      id: uid('ln'),
      kind: c.kind,
      code: c.code,
      system: c.system,
      description: c.description,
      amountAed: c.amountAed,
      linkedDxIds: c.kind === 'px' && firstDx ? [firstDx.id] : [],
      match: 'matched',
      confidence: 0.99,
      evidenceTurnIds: [],
    };
    onClaim({ ...claim, lines: [...claim.lines, line] });
    setAdding(false);
  };

  const editBtn = canEdit ? (
    <Button size="sm" variant="ghost" disabled={!active} onClick={() => setEditing((e) => !e)} leading={editing ? <Check size={16} aria-hidden /> : <Pencil size={16} aria-hidden />}>
      {editing ? 'Done' : 'Edit'}
    </Button>
  ) : (
    <Tooltip content={readOnlyReason}>
      <span tabIndex={0} className="rounded-full focus-visible:outline-none focus-visible:shadow-focus">
        <Button size="sm" variant="ghost" disabled leading={<Pencil size={16} aria-hidden />}>
          Edit
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
        <h3 className="text-h4 font-medium">Encounter Coding</h3>
        {editBtn}
      </div>
      <div className="thin-scroll dot-grid flex-1 overflow-y-auto px-5 py-4">
        {lines.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} aria-hidden />}
            title="No codes yet"
            body="Medexa found none in this session."
            action={canEdit ? <Button variant="outline" disabled={!active} onClick={() => { setEditing(true); setAdding(true); }} leading={<Plus size={16} aria-hidden />}>Add code</Button> : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((l) => {
              const issue = lineIssue(l);
              const match = issue?.rule === 'px-no-dx' && l.match === 'matched' ? 'review' : l.match;
              const m = matchMeta[match];
              return (
                <li key={l.id} className={cn('rounded-lg border bg-surface p-3.5', issue?.severity === 'error' ? 'border-error' : 'border-line')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <CodeChip code={l.code} />
                    <span className="inline-flex h-6 items-center rounded-sm border border-line-strong px-1.5 text-caption text-fg-secondary">{l.system}</span>
                    <span className="text-caption text-fg-tertiary">{l.kind === 'dx' ? 'Diagnosis' : 'Procedure'}</span>
                    <span className={cn('ml-auto inline-flex items-center gap-1 text-body', m.cls)}>
                      {m.icon} {m.label}
                    </span>
                  </div>
                  {changing === l.id ? (
                    <div className="mt-3">
                      <CodePicker kind={l.kind} initial={l.code} onPick={(c) => change(l, c)} onCancel={() => setChanging(null)} />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <Evidence turnIds={l.evidenceTurnIds} rule={`${l.system} match`} confidence={l.confidence}>
                        <p className="text-body-lg text-fg">{l.description}</p>
                      </Evidence>
                      <span className="ml-auto flex items-center gap-1">
                        {editing && (
                          <Button size="sm" variant="ghost" onClick={() => setChanging(l.id)}>
                            Change code
                          </Button>
                        )}
                        <IconButton aria-label={`Delete ${l.code}`} size="sm" disabled={!canEdit || !active} onClick={() => remove(l)}>
                          <Trash2 size={20} />
                        </IconButton>
                      </span>
                    </div>
                  )}
                  {issue && <p className={cn('mt-2 text-body-sm', issue.severity === 'error' ? 'text-error-text' : 'text-warning-text')}>{issue.title}</p>}
                </li>
              );
            })}
            {editing &&
              (adding ? (
                <li className="rounded-lg border border-dashed border-primary p-3">
                  <CodePicker onPick={add} onCancel={() => setAdding(false)} />
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => setAdding(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong py-3 text-body text-fg-secondary hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <Plus size={16} aria-hidden /> Add code
                  </button>
                </li>
              ))}
          </ul>
        )}

        <section className="mt-6" aria-labelledby="rev-int">
          <h3 id="rev-int" className="flex items-center gap-2 text-h4 font-semibold text-ink dark:text-fg">
            <Sparkles size={16} className="text-indigo" aria-hidden /> Revenue Intelligence
          </h3>
          <div className="mt-3 flex flex-col gap-4">
            <MeterRow label="DX Support Confidence" value={dxConfidence} tone="success" />
            <MeterRow label="Claims Readiness" value={readiness} tone="primary" />
          </div>
        </section>

        <button
          onClick={onOpenDenials}
          className={cn(
            'mt-5 flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-body font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
            denials.length ? 'bg-error-bg text-error-text hover:brightness-95' : 'bg-success-bg text-success-text',
          )}
        >
          {denials.length ? <CircleX size={20} aria-hidden /> : <Check size={20} aria-hidden />}
          <span className="flex-1">{denials.length ? 'Active Denial Loop' : 'No active denials'}</span>
          {denials.length > 0 && (
            <StatusPill tone="outline" size="sm" className="bg-surface-sunken">
              {denials.length} Items
            </StatusPill>
          )}
        </button>

        {denials.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-dark-card px-5 py-4 text-fg-on-dark">
            <div className="flex-1">
              <p className="flex items-center gap-2 text-body-lg">
                <span className="h-2 w-2 rounded-full bg-warning" aria-hidden /> Claim Readiness
              </p>
              <p className="mt-1 text-body-lg">
                {denials.length} issue{denials.length > 1 ? 's' : ''} found as Active Denial loop that may impact claim approval.
              </p>
            </div>
            <IconButton aria-label="Open Active Denial Loop" variant="dark" className="bg-surface text-ink hover:bg-surface-muted" onClick={onOpenDenials}>
              <ChevronRight size={20} />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}
