import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Bot, CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button, DrawerPanel, Menu, Skeleton, StatusChip } from '../../components/ui';
import { useSimNow } from '../../engine/clock';
import { pipelineTotal, usePipeline } from '../../engine/pipeline';
import { payerLabel } from '../../mocks/fixtures';
import { cn, fmtAed, fmtCountdown, fmtInt } from '../../lib/format';
import { useDemo, type PriorityLive } from '../../store/demo';
import { toast } from '../../store/toast';

const H = 3600000;

/** Urgency 0-100 from AED at risk and time left. */
export function urgency(amountAed: number, msLeft: number) {
  const hours = Math.max(0, msLeft / H);
  const a = (35 * Math.log(Math.max(amountAed, 1000) / 1000)) / Math.log(18.4);
  const t = Math.max(0, 60 - hours * 0.3);
  return Math.max(0, Math.min(100, Math.round(a + t)));
}

const dotFor = (ms: number) => (ms < 4 * H ? 'bg-error' : ms < 24 * H ? 'bg-warning' : 'bg-success');

type Rank = 'urgency' | 'amount' | 'deadline';

export function PriorityQueue({ loading }: { loading: boolean }) {
  const now = useSimNow(1000);
  const items = useDemo((s) => s.priority);
  const resolve = useDemo((s) => s.resolvePriority);
  const total = usePipeline((s) => pipelineTotal(s.counts));
  const [rank, setRank] = useState<Rank>('urgency');
  const [open, setOpen] = useState<PriorityLive | null>(null);
  const [assigning, setAssigning] = useState(false);

  const scored = items
    .map((i) => ({ ...i, left: i.deadline - now, score: urgency(i.amountAed, i.deadline - now) }))
    .sort((a, b) => (rank === 'urgency' ? b.score - a.score : rank === 'amount' ? b.amountAed - a.amountAed : a.left - b.left));
  const [hero, ...rest] = scored;
  const deck = rest.slice(0, 3);
  const deckBg = ['bg-deck-1 text-fg-on-dark', 'bg-deck-2 text-fg-on-dark', 'bg-deck-3 text-ink'];

  return (
    <section aria-label="Priority Queue" className="flex h-full flex-col overflow-hidden rounded-xl bg-dark-card text-fg-on-dark shadow-raised">
      <header className="flex items-center justify-between gap-2 border-b border-line-dark px-6 py-4">
        <h2 className="text-h3 font-medium">Priority Queue</h2>
        <div className="flex items-center gap-2">
          <Menu
            items={(['urgency', 'amount', 'deadline'] as Rank[]).map((r) => ({ label: r[0].toUpperCase() + r.slice(1), onSelect: () => setRank(r) }))}
            trigger={
              <button className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body-lg text-fg-on-dark-muted hover:bg-dark-card2 focus-visible:outline-none focus-visible:shadow-focus">
                ranked by <span className="text-fg-on-dark">{rank}</span>
                <ChevronDown size={20} aria-hidden />
              </button>
            }
          />
          <button
            onClick={() => toast({ tone: 'info', title: 'Available in the full product' })}
            className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body-lg hover:bg-dark-card2 focus-visible:outline-none focus-visible:shadow-focus"
          >
            See all <ArrowUpRight size={16} aria-hidden />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4 p-6" aria-busy="true">
          <Skeleton className="h-10 w-40 opacity-30" />
          <Skeleton className="h-6 w-60 opacity-30" />
          <Skeleton className="h-16 w-full opacity-30" />
        </div>
      ) : !hero ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line-dark">
            <ShieldCheck size={24} aria-hidden />
          </span>
          <p className="text-h4">Nothing urgent.</p>
          <p className="text-body text-fg-on-dark-muted">Medexa is watching {fmtInt(total)} claims.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.button
              key={hero.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(hero)}
              aria-label={`Urgency ${hero.score}. ${hero.kind} ${hero.ref}, ${fmtAed(hero.amountAed)}, ${fmtCountdown(hero.left)}, ${payerLabel(hero.payer)}. ${hero.reason}. Open case.`}
              className="group relative bg-dark-card px-6 py-5 text-left focus-visible:outline-none focus-visible:shadow-focus"
              style={{ backgroundImage: 'var(--gradient-dark-card)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-7 items-center rounded-sm bg-dark-card2 px-2 text-body-sm tabular">{hero.score}</span>
                <span className="inline-flex h-7 items-center rounded-sm bg-deck-3 px-2.5 text-body-sm text-ink tabular">
                  {hero.kind} #{hero.ref}
                </span>
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-3">
                <span className="text-display font-semibold tabular">{fmtAed(hero.amountAed)}</span>
                <span className="inline-flex items-center gap-1.5 text-body-lg tabular">
                  <span className={cn('h-1.5 w-1.5 rounded-full', dotFor(hero.left))} aria-hidden />
                  {fmtCountdown(hero.left)}
                </span>
              </p>
              <p className="mt-3 text-h4">{payerLabel(hero.payer)}</p>
              <p className="text-body text-fg-on-dark-muted">{hero.reason.replace(': ', ' — ')}</p>
              <span className="absolute bottom-5 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-fg-on-dark transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden>
                <ArrowRight size={20} />
              </span>
            </motion.button>
            {deck.map((it, i) => (
              <motion.button
                key={it.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ duration: 0.25 }}
                onClick={() => setOpen(it)}
                aria-label={`Urgency ${it.score}. ${payerLabel(it.payer)}, ${fmtCountdown(it.left)}. ${it.reason}. ${it.kind} ${it.ref}. Open case.`}
                className={cn(
                  '-mt-2 flex items-center gap-3 rounded-t-xl px-4 py-4 text-left transition-[filter] duration-fast hover:brightness-110 focus-visible:outline-none focus-visible:shadow-focus',
                  deckBg[i],
                )}
              >
                <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-sm bg-ink text-body-sm text-fg-on-dark tabular">{it.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-body-lg">
                    {payerLabel(it.payer)}
                    <span className="inline-flex items-center gap-1 text-body tabular">
                      <span className={cn('h-1.5 w-1.5 rounded-full', dotFor(it.left))} aria-hidden /> {fmtCountdown(it.left)}
                    </span>
                  </span>
                  <span className="block truncate text-body opacity-80">{it.reason.replace(': ', ' — ')}</span>
                </span>
                <span className="hidden sm:inline-flex">
                  <StatusChip kind={it.kind} refId={it.ref} />
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <DrawerPanel
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `${open.kind} #${open.ref}` : ''}
        subtitle={open ? `${payerLabel(open.payer)} · ${fmtAed(open.amountAed)} · ${fmtCountdown(open.deadline - now)}` : undefined}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              loading={assigning}
              leading={<Bot size={16} aria-hidden />}
              onClick={async () => {
                setAssigning(true);
                await new Promise((r) => setTimeout(r, 600));
                setAssigning(false);
                toast({ tone: 'success', title: 'Assigned to Appeals agent', body: 'Medexa will draft the fix and notify you.' });
              }}
            >
              Assign to agent
            </Button>
            <Button
              leading={<CheckCircle2 size={16} aria-hidden />}
              onClick={() => {
                if (!open) return;
                resolve(open.id);
                toast({ tone: 'success', title: `${open.kind} #${open.ref} resolved` });
                setOpen(null);
              }}
            >
              Mark resolved
            </Button>
          </div>
        }
      >
        {open && (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-caption font-medium uppercase text-fg-tertiary">Payer reason</h3>
              <p className="mt-1 text-body-lg text-fg">{open.reason}</p>
            </section>
            <section>
              <h3 className="text-caption font-medium uppercase text-fg-tertiary">Case timeline</h3>
              <ol className="mt-2 flex flex-col gap-3 border-l border-line pl-4">
                {open.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <p className="text-body-sm font-medium text-fg">{t.at}</p>
                    <p className="text-body text-fg-secondary">{t.text}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section className="ai-ring rounded-md bg-primary-subtle p-4">
              <h3 className="text-body font-medium text-primary">Suggested fix</h3>
              <p className="mt-1 text-body text-fg">{open.fix}</p>
            </section>
          </div>
        )}
      </DrawerPanel>
    </section>
  );
}
