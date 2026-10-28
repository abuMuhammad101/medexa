import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Check, CheckCheck, Ear, MessageCircleQuestion, PauseCircle, Sparkles, X } from 'lucide-react';
import { Button, EmptyState, IconButton, SegmentedControl } from '../../components/ui';
import { SuggestionRow } from '../../components/ui/Rows';
import { cn } from '../../lib/format';
import { useSession } from '../../store/session';
import { toast } from '../../store/toast';
import type { Suggestion } from '../../store/types';
import { Spark } from '../shell/Brand';

type Filter = 'all' | 'billing' | 'detected' | 'protocol';

export function InsightsFeed({
  suggestions,
  status,
  stillListening,
  focusedKey,
  setFocusedKey,
  pulseKey,
}: {
  suggestions: Suggestion[];
  status: 'pre' | 'recording' | 'paused' | 'stopped';
  stillListening: boolean;
  focusedKey: string | null;
  setFocusedKey: (k: string | null) => void;
  pulseKey: string | null;
}) {
  const setSuggestion = useSession((s) => s.setSuggestion);
  const keepAll = useSession((s) => s.keepAll);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const seen = useRef(new Set<string>());
  const [fresh, setFresh] = useState<string | null>(null);

  const visible = suggestions.filter((s) => s.status !== 'dismissed');
  const open = visible.filter((s) => s.status === 'open').sort((a, b) => b.createdAt - a.createdAt);
  const kept = visible.filter((s) => s.status === 'kept').sort((a, b) => b.createdAt - a.createdAt);
  const pass = (s: Suggestion) => filter === 'all' || s.kind === filter;
  const openBilling = open.filter((s) => s.kind === 'billing' && s.confidence >= 0.85);

  // new arrivals: highlight; if user scrolled down, count instead of moving the list
  useLayoutEffect(() => {
    const ids = suggestions.map((s) => s.key);
    const newOnes = ids.filter((k) => !seen.current.has(k));
    if (!newOnes.length) return;
    newOnes.forEach((k) => seen.current.add(k));
    const el = scrollRef.current;
    if (el && el.scrollTop > 40 && seen.current.size > newOnes.length) setUnseen((n) => n + newOnes.length);
    setFresh(newOnes[newOnes.length - 1]);
  }, [suggestions]);

  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setFresh(null), 1600);
    return () => clearTimeout(t);
  }, [fresh]);

  // scroll to + pulse when a transcript entity is clicked (pulseKey = "key:nonce")
  const pulseTarget = pulseKey?.split(':')[0] ?? null;
  useEffect(() => {
    if (!pulseKey) return;
    const el = document.getElementById(`sg-${pulseKey.split(':')[0]}`);
    if (!el) toast({ tone: 'info', title: 'That suggestion was dismissed or has not arrived yet' });
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  }, [pulseKey]);

  const dismiss = (s: Suggestion) => {
    setSuggestion(s.key, { status: 'dismissed' });
    if (focusedKey === s.key) setFocusedKey(null);
    toast({
      tone: 'info',
      title: 'Suggestion dismissed',
      body: s.text.length > 70 ? `${s.text.slice(0, 70)}...` : s.text,
      durationMs: 5000,
      action: { label: 'Undo', onClick: () => setSuggestion(s.key, { status: 'open' }) },
    });
  };
  const toggleKeep = (s: Suggestion) => setSuggestion(s.key, { status: s.status === 'kept' ? 'open' : 'kept' });

  const renderItem = (s: Suggestion) => {
    const common = {
      id: `sg-${s.key}`,
      onFocus: () => setFocusedKey(s.key),
      className: cn('scroll-mt-20 rounded-lg outline-none', focusedKey === s.key && 'ring-2 ring-primary'),
      tabIndex: -1,
    };
    const highlight = fresh === s.key || pulseTarget === s.key;
    if (s.kind === 'protocol') {
      return (
        <div {...common}>
          <button
            onClick={() => setSuggestion(s.key, { asked: !s.asked })}
            aria-pressed={!!s.asked}
            className={cn(
              'w-full rounded-lg border px-5 py-4 text-left transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus',
              s.asked ? 'border-line bg-surface-muted' : 'border-indigo bg-surface shadow-xs hover:shadow-raised',
              highlight && 'pulse-highlight',
            )}
          >
            <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-body font-medium', s.asked ? 'bg-surface-sunken text-fg-secondary' : 'bg-primary text-fg-on-dark')}>
              {s.asked ? <Check size={16} aria-hidden /> : <MessageCircleQuestion size={16} aria-hidden />}
              {s.asked ? 'Asked' : 'Protocol Ask'}
            </span>
            <span className={cn('mt-3 block text-body-lg', s.asked ? 'text-fg-secondary' : 'text-fg')}>"{s.text}"</span>
            {s.answer ? (
              <span className="mt-2 block rounded-md bg-success-bg px-3 py-2 text-body text-success-text">
                <Ear size={16} className="mr-1 inline" aria-hidden /> Answer captured: {s.answer}
              </span>
            ) : s.asked ? (
              <span className="mt-2 block text-body-sm text-fg-tertiary">Listening for the answer...</span>
            ) : (
              <span className="sr-only">Press to mark as asked</span>
            )}
          </button>
        </div>
      );
    }
    if (s.kind === 'readiness') {
      return (
        <div {...common}>
          <div className={cn('rounded-lg bg-claim-ready px-6 py-4 text-fg-on-dark', highlight && 'pulse-highlight')}>
            <p className="flex items-center gap-2 text-h4">
              <span className="h-2 w-2 rounded-full bg-warning" aria-hidden /> Claim Readiness
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="flex-1 text-body-lg text-fg-on-dark-muted">{s.text}</p>
              <Button
                size="sm"
                variant="outline"
                className="border-line-dark bg-transparent text-fg-on-dark hover:bg-dark-card2"
                onClick={() => toggleKeep(s)}
                aria-pressed={s.status === 'kept'}
                leading={<Check size={16} aria-hidden />}
              >
                {s.status === 'kept' ? 'Kept' : 'Keep'}
              </Button>
              <IconButton aria-label="Dismiss claim readiness" size="sm" variant="dark" onClick={() => dismiss(s)}>
                <X size={20} />
              </IconButton>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div {...common}>
        <SuggestionRow
          tag={s.kind === 'billing' ? 'Billing' : 'Detected'}
          text={s.text}
          state={s.status === 'kept' ? 'kept' : 'pending'}
          highlight={highlight}
          onKeep={() => toggleKeep(s)}
          onDismiss={() => dismiss(s)}
          footer={
            <p className="mt-1 flex items-center gap-1.5 text-caption text-fg-tertiary">
              <Spark size={12} /> {Math.round(s.confidence * 100)}% confidence · {s.rule}
            </p>
          }
        />
      </div>
    );
  };

  const latest = open[0];

  return (
    <section aria-labelledby="insights-h" className="glass dot-grid relative flex h-full min-h-0 flex-col rounded-xl border border-line shadow-xs">
      <header className="px-8 pt-8">
        <h2 id="insights-h" className={cn('text-body-lg', status === 'recording' ? 'shimmer-text' : 'text-fg-secondary')}>
          {status === 'recording' ? 'Medexa is Processing for Insights...' : status === 'paused' ? 'Paused: not listening' : status === 'pre' ? 'Medexa is ready' : 'Session ended'}
        </h2>
        <p className="mt-2 text-body text-fg-secondary">
          <span className="font-semibold text-fg tabular">{open.length}</span> Suggestions
          {kept.length > 0 && <span> · {kept.length} kept</span>}
        </p>
        {(scrolled || visible.length > 5) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SegmentedControl<Filter>
              size="sm"
              label="Filter suggestions"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'billing', label: 'Billing' },
                { value: 'detected', label: 'Detected' },
                { value: 'protocol', label: 'Protocol Ask' },
              ]}
            />
          </div>
        )}
        {openBilling.length >= 3 && (
          <Button
            className="mt-3"
            size="sm"
            variant="tinted"
            leading={<CheckCheck size={16} aria-hidden />}
            onClick={() => {
              keepAll(openBilling.map((s) => s.key));
              toast({ tone: 'success', title: `Kept ${openBilling.length} high-confidence billing items` });
            }}
          >
            Keep all high-confidence ({openBilling.length})
          </Button>
        )}
      </header>

      {/* polite announcements for new suggestions only */}
      <p className="sr-only" aria-live="polite">
        {latest ? `New suggestion: ${latest.text}` : ''}
      </p>

      <AnimatePresence>
        {unseen > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              setUnseen(0);
            }}
            className="absolute left-1/2 top-40 z-10 inline-flex h-8 -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 text-body-sm text-fg-on-dark shadow-raised focus-visible:outline-none focus-visible:shadow-focus"
          >
            <ArrowUp size={16} aria-hidden /> {unseen} new
          </motion.button>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          setScrolled(top > 24);
          if (top < 40) setUnseen(0);
        }}
        className="thin-scroll mt-4 min-h-0 flex-1 overflow-y-auto px-6 pb-8"
        role="feed"
        aria-label="Suggestions"
      >
        {status === 'paused' && (
          <p className="mb-3 flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2 text-body-sm text-fg-secondary" role="status">
            <PauseCircle size={16} aria-hidden /> Paused: not listening
          </p>
        )}
        {stillListening && status === 'recording' && (
          <p className="mb-3 flex items-center gap-2 rounded-md bg-primary-subtle px-3 py-2 text-body-sm text-fg" role="status">
            <Ear size={16} aria-hidden /> Still listening
          </p>
        )}
        {visible.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} aria-hidden />}
            title={status === 'pre' ? 'Ready when you are' : 'Listening'}
            body="Medexa is listening. Suggestions will appear as the conversation develops."
          />
        ) : (
          <ul className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {open.filter(pass).map((s) => (
                <motion.li
                  key={s.key}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderItem(s)}
                </motion.li>
              ))}
            </AnimatePresence>
            {kept.filter(pass).length > 0 && (
              <li className="mt-2">
                <h3 className="mb-2 flex items-center gap-2 text-caption font-medium uppercase text-success-text">
                  <Check size={12} aria-hidden /> Kept · feeds SOAP note and claim
                </h3>
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {kept.filter(pass).map((s) => (
                      <motion.li key={s.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {renderItem(s)}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
