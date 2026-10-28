import { useState, type ReactNode } from 'react';
import { Check, Pencil, RotateCcw, X } from 'lucide-react';
import { Button, SegmentedControl, Textarea, Tooltip } from '../../components/ui';
import { CLINICIAN } from '../../mocks/fixtures';
import { cn, fmtTime, weekdayShort } from '../../lib/format';
import type { ReviewDraft } from '../../store/demo';
import type { ClaimLine } from '../../store/types';
import { PROCEDURE_AR, SUMMARY_TEXT, nextSessions, procedurePhrase } from './content';

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function SummaryCard({
  summary,
  onSummary,
  procedures,
  sessionNo,
  sessionsPlanned,
  flexion,
  now,
  canEdit,
  readOnlyReason,
  active,
}: {
  summary: ReviewDraft['summary'];
  onSummary: (s: ReviewDraft['summary']) => void;
  procedures: ClaimLine[];
  sessionNo: number;
  sessionsPlanned: number;
  flexion: number;
  now: Date;
  canEdit: boolean;
  readOnlyReason: string;
  active: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [picked, setPicked] = useState(0);
  const lang = summary.lang;
  const T = SUMMARY_TEXT[lang];
  const dates = nextSessions(now);
  const chip = (c: ClaimLine) => (
    <span key={c.id} className="mx-0.5 inline-flex rounded-xs bg-indigo-bg px-1.5 text-indigo">
      {lang === 'ar' ? PROCEDURE_AR[c.code] ?? c.description : procedurePhrase(c.code, c.description)}
    </span>
  );
  const procs = procedures.length ? procedures.slice(0, 3) : [];
  const joined: ReactNode[] = [];
  procs.forEach((p, i) => {
    if (i > 0) joined.push(i === procs.length - 1 ? ` ${T.and} ` : ', ');
    joined.push(chip(p));
  });
  const [impPrefix, impValue] = T.improvement(flexion);
  const paragraph = summary.level === 'detailed' ? T.performedDetailed : T.performed;

  const medexaPlain = `${T.dear} ${T.completed(sessionNo, sessionsPlanned)} ${T.included} ${procs.map((p) => (lang === 'ar' ? PROCEDURE_AR[p.code] ?? p.description : procedurePhrase(p.code, p.description))).join(lang === 'ar' ? ' و' : ' and ')} ${T.focused}\n\n${impPrefix} ${impValue}.\n\n${paragraph}`;

  return (
    <div className="flex h-full flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
        <h3 className="text-h4 font-medium">{T.title}</h3>
        <div className="flex items-center gap-2" dir="ltr">
          <SegmentedControl<'en' | 'ar'>
            size="sm"
            label="Summary language"
            value={lang}
            onChange={(v) => active && onSummary({ ...summary, lang: v })}
            options={[
              { value: 'en', label: 'EN' },
              { value: 'ar', label: 'ع' },
            ]}
          />
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} leading={<X size={16} aria-hidden />}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onSummary({ ...summary, text: draft });
                  setEditing(false);
                }}
                leading={<Check size={16} aria-hidden />}
              >
                Save
              </Button>
            </>
          ) : canEdit ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={!active}
              onClick={() => {
                setDraft(summary.text ?? medexaPlain);
                setEditing(true);
              }}
              leading={<Pencil size={16} aria-hidden />}
            >
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
      </div>

      <div className="thin-scroll dot-grid flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2" dir="ltr">
          <SegmentedControl<'simple' | 'detailed'>
            size="sm"
            label="Reading level"
            value={summary.level}
            onChange={(v) => active && onSummary({ ...summary, level: v, text: null })}
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'detailed', label: 'Detailed' },
            ]}
          />
          {summary.text !== null && (
            <Button size="sm" variant="ghost" disabled={!active || !canEdit} onClick={() => onSummary({ ...summary, text: null })} leading={<RotateCcw size={16} aria-hidden />}>
              Reset to Medexa version
            </Button>
          )}
        </div>

        {editing ? (
          <Textarea label="Plain-language summary" value={draft} maxLength={1200} rows={10} onChange={(e) => setDraft(e.target.value)} />
        ) : summary.text !== null ? (
          <div className="whitespace-pre-wrap text-body-lg leading-relaxed text-fg">{summary.text}</div>
        ) : (
          <>
            <p className="text-body-lg text-fg">
              {T.dear} <strong className="font-semibold">{T.completed(sessionNo, sessionsPlanned)}</strong> {T.included} {joined} {T.focused}
            </p>
            <div className="mt-4 rounded-lg border border-line bg-surface p-4">
              <p className="text-body-lg font-medium">{T.keyImprovement}</p>
              <p className="mt-1 text-body text-fg-secondary">
                {/* DESIGN-DECISION: lumbar measure instead of the design's knee flexion */}
                {impPrefix} <strong className="font-semibold text-primary">{impValue}</strong>.
              </p>
            </div>
            <p className="mt-4 text-body-lg text-fg-secondary">{paragraph}</p>
          </>
        )}

        <h4 className="mt-6 text-body-lg font-medium">{T.carePlan}</h4>
        <div role="radiogroup" aria-label={T.carePlan} className="mt-3 grid grid-cols-3 gap-3">
          {dates.map((d, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={picked === i}
              onClick={() => setPicked(i)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border py-3 transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
                picked === i ? 'border-indigo bg-indigo-bg' : 'border-line bg-surface hover:bg-surface-muted',
              )}
            >
              <span className="text-body text-fg-secondary">{lang === 'ar' ? AR_DAYS[d.getDay()] : weekdayShort(d)}</span>
              <span className="text-h2 font-medium text-indigo tabular">{d.getDate()}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo" aria-hidden />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-body text-fg-secondary" aria-live="polite">
          {fmtTime(dates[picked])} · {CLINICIAN.fullName} · {T.continuing(3)}
        </p>
      </div>
    </div>
  );
}
