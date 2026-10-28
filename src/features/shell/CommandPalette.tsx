import { useMemo, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Home, Languages, LayoutGrid, Moon, PlayCircle, Search, User } from 'lucide-react';
import { SCENARIO_LIST } from '../../engine/scenarios';
import { cn } from '../../lib/format';
import { useKeydown } from '../../lib/hooks';
import { useDemo } from '../../store/demo';
import { toast } from '../../store/toast';
import { useUi } from '../../store/ui';
import { encounterPath, prepareSession } from './navigation';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPalette);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();
  const patients = useDemo((s) => s.patients);
  const encounters = useDemo((s) => s.encounters);

  useKeydown(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUi.getState().paletteOpen);
      }
    },
    [],
    true,
  );

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      { id: 'home', group: 'Go to', label: 'Control room', icon: <Home size={16} />, run: () => navigate('/') },
      { id: 'all', group: 'Go to', label: 'All upcoming encounters', icon: <LayoutGrid size={16} />, run: () => navigate('/encounters') },
      { id: 'kit', group: 'Go to', label: 'UI kit', icon: <LayoutGrid size={16} />, run: () => navigate('/kit') },
    ];
    for (const p of patients) {
      const enc = encounters.find((e) => e.patientId === p.id);
      list.push({
        id: `p-${p.id}`,
        group: 'Patients',
        label: p.name,
        hint: enc ? enc.refId : 'No encounter',
        icon: <User size={16} />,
        run: () => {
          if (!enc) return toast({ tone: 'info', title: `${p.name} has no upcoming encounter` });
          const path = encounterPath(enc);
          if (!path) return toast({ tone: 'warning', title: `${p.name}: NPHIES inactive`, body: enc.inactiveReason });
          if (path.startsWith('/session')) prepareSession(enc);
          navigate(path);
        },
      });
      if (enc && enc.status === 'queued' && enc.nphies !== 'inactive') {
        list.push({
          id: `s-${p.id}`,
          group: 'Start session',
          label: `Start session: ${p.name}`,
          icon: <PlayCircle size={16} />,
          run: () => {
            prepareSession(enc);
            navigate(`/session/${enc.id}`);
          },
        });
      }
    }
    for (const s of SCENARIO_LIST) {
      list.push({
        id: `sc-${s.id}`,
        group: 'Scenario',
        label: `Switch scenario: ${s.name}`,
        icon: <Clapperboard size={16} />,
        run: () => {
          useDemo.getState().setScenarioOverride(s.id);
          toast({ tone: 'info', title: `Scenario: ${s.name}` });
        },
      });
    }
    list.push(
      { id: 'lang', group: 'Settings', label: 'Toggle language (English / Arabic)', icon: <Languages size={16} />, run: () => useUi.getState().toggleLang() },
      { id: 'theme', group: 'Settings', label: 'Toggle theme', icon: <Moon size={16} />, run: () => useUi.getState().toggleTheme() },
    );
    return list;
  }, [patients, encounters, navigate]);

  const filtered = cmds.filter((c) => (c.label + ' ' + (c.hint ?? '')).toLowerCase().includes(q.toLowerCase()));

  const run = (c: Cmd) => {
    setOpen(false);
    setQ('');
    c.run();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[86] bg-scrim backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-30 z-[87] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-modal focus:outline-none">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={20} className="text-fg-tertiary" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSel((s) => Math.min(filtered.length - 1, s + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSel((s) => Math.max(0, s - 1));
                } else if (e.key === 'Enter' && filtered[sel]) run(filtered[sel]);
              }}
              placeholder="Jump to patient, start session, switch scenario..."
              aria-label="Search commands"
              aria-controls="cmd-list"
              aria-activedescendant={filtered[sel] ? `cmd-${filtered[sel].id}` : undefined}
              role="combobox"
              aria-expanded="true"
              className="h-14 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-tertiary"
            />
          </div>
          <ul id="cmd-list" role="listbox" className="thin-scroll max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-body text-fg-secondary">No matches</li>}
            {filtered.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === sel}
                onMouseEnter={() => setSel(i)}
                onClick={() => run(c)}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-body',
                  i === sel ? 'bg-primary-subtle text-fg' : 'text-fg',
                )}
              >
                <span className="text-fg-secondary" aria-hidden>{c.icon}</span>
                <span className="flex-1 truncate">{c.label}</span>
                {c.hint && <span className="text-caption text-fg-tertiary tabular">{c.hint}</span>}
                <span className="text-caption text-fg-tertiary">{c.group}</span>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
