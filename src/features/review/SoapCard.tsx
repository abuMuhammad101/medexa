import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { Button, Tab, Textarea, Tooltip } from '../../components/ui';
import { cn } from '../../lib/format';
import type { SoapSection, SoapTab } from '../../store/demo';
import { Evidence } from './Evidence';
import { SOAP_FIELDS, soapGaps } from './content';

const TABS: { id: SoapTab; label: string }[] = [
  { id: 'subjective', label: 'Subjective' },
  { id: 'objective', label: 'Objective' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'plan', label: 'Plan' },
];

export function SoapCard({
  soap,
  onChange,
  canEdit,
  readOnlyReason,
  active,
  diagnoses,
  dischargeSuggested,
}: {
  soap: Record<SoapTab, SoapSection>;
  onChange: (next: Record<SoapTab, SoapSection>) => void;
  canEdit: boolean;
  readOnlyReason: string;
  active: boolean;
  diagnoses: { code: string; description: string }[];
  dischargeSuggested: boolean;
}) {
  const [tab, setTab] = useState<SoapTab>('subjective');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // opening a tab marks it reviewed
  useEffect(() => {
    if (!active || soap[tab].reviewed) return;
    onChange({ ...soap, [tab]: { ...soap[tab], reviewed: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, active]);

  const section = soap[tab];
  const meta = SOAP_FIELDS[tab];

  const startEdit = () => {
    setDraft({ ...section.fields });
    setEditing(true);
  };
  const save = () => {
    onChange({ ...soap, [tab]: { ...section, fields: { ...section.fields, ...draft } } });
    setEditing(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="SOAP sections" className="flex flex-wrap gap-2 border-b border-line px-6 py-4">
        {TABS.map((t, i) => {
          const gaps = soapGaps(t.id, soap[t.id]);
          return (
            <Tab
              key={t.id}
              ref={(el) => (tabRefs.current[i] = el)}
              active={tab === t.id}
              status={gaps ? 'gaps' : soap[t.id].reviewed ? 'reviewed' : 'none'}
              tabIndex={tab === t.id ? 0 : -1}
              aria-controls={`soap-${t.id}`}
              disabled={!active}
              onClick={() => {
                setTab(t.id);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!dir) return;
                e.preventDefault();
                e.stopPropagation();
                const n = (i + dir + TABS.length) % TABS.length;
                setTab(TABS[n].id);
                tabRefs.current[n]?.focus();
              }}
            >
              {t.label}
            </Tab>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <h3 className="text-h4 font-medium">{meta.title}</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} leading={<X size={16} aria-hidden />}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} leading={<Check size={16} aria-hidden />}>
              Save
            </Button>
          </div>
        ) : canEdit ? (
          <Button size="sm" variant="ghost" onClick={startEdit} disabled={!active} leading={<Pencil size={16} aria-hidden />}>
            Edit
          </Button>
        ) : (
          <Tooltip content={readOnlyReason}>
            <span tabIndex={0} className="rounded-full focus-visible:outline-none focus-visible:shadow-focus">
              <Button size="sm" variant="ghost" disabled leading={<Pencil size={16} aria-hidden />}>
                Edit
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      <div id={`soap-${tab}`} role="tabpanel" aria-label={meta.title} className="thin-scroll dot-grid flex-1 overflow-y-auto px-6 py-5">
        {tab === 'subjective' && <h4 className="mb-3 text-h3 font-medium">Patient Narrative</h4>}
        {dischargeSuggested && tab === 'plan' && (
          <p className="mb-4 rounded-md bg-success-bg px-3 py-2 text-body-sm text-success-text">Plan of care complete: Medexa suggests a discharge summary and code 9.1.20 (Discharge evaluation).</p>
        )}
        <div className="flex flex-col gap-5">
          {meta.fields.map((f) => {
            const value = section.fields[f.key] ?? '';
            if (editing)
              return <Textarea key={f.key} label={f.label} value={draft[f.key] ?? ''} rows={f.list ? 4 : 3} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />;
            return (
              <section key={f.key}>
                <h5 className="mb-2 text-body font-semibold text-ink dark:text-fg">{f.label}</h5>
                {!value.trim() ? (
                  <button
                    type="button"
                    onClick={canEdit ? startEdit : undefined}
                    disabled={!canEdit || !active}
                    className="flex w-full items-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-body text-fg-tertiary hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus disabled:hover:border-line-strong disabled:hover:text-fg-tertiary"
                  >
                    <Plus size={16} aria-hidden /> {f.placeholder ?? `Add ${f.label.toLowerCase()}`}
                    <span className="ml-auto rounded-full bg-warning-bg px-2 text-caption text-warning-text">Gap</span>
                  </button>
                ) : (
                  <Evidence turnIds={f.evidence} rule={f.rule} confidence={f.confidence}>
                    {f.list ? (
                      <ul className="flex flex-col gap-2">
                        {value.split('\n').filter(Boolean).map((line, i) => (
                          <li key={i} className="flex items-center gap-3 rounded-md bg-surface-muted px-4 py-3 text-body text-fg">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={cn('rounded-md border border-line bg-surface px-4 py-3 text-body text-fg', f.key === 'chief' && 'italic')}>
                        {f.key === 'chief' ? `“${value}”` : value}
                      </p>
                    )}
                  </Evidence>
                )}
              </section>
            );
          })}
          {tab === 'assessment' && diagnoses.length > 0 && (
            <section>
              <h5 className="mb-2 text-body font-semibold text-ink dark:text-fg">Diagnosis codes</h5>
              <ul className="flex flex-wrap gap-2">
                {diagnoses.map((d) => (
                  <li key={d.code} className="inline-flex items-center gap-2 rounded-md border border-line px-2 py-1 text-body-sm">
                    <span className="rounded-xs bg-ink px-1.5 text-caption text-fg-on-dark tabular">{d.code}</span>
                    {d.description}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
