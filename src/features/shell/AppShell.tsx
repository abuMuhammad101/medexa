import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Asterisk, Bell, Check, Home, Languages, Lock, Megaphone, RotateCcw, Search, User, WifiOff } from 'lucide-react';
import { Button, DemoBadge, NavItem, Tooltip } from '../../components/ui';
import { CLINICIAN, DEMO_CONFIG } from '../../mocks/fixtures';
import { BELOW_MD, useKeydown, useMediaQuery, useOnline } from '../../lib/hooks';
import { useUi } from '../../store/ui';
import type { Role } from '../../store/types';
import { toast } from '../../store/toast';
import { resetDemo } from './resetDemo';
import { Avatar, LogoMark } from './Brand';
import { cn } from '../../lib/format';

function AvatarMenu() {
  const role = useUi((s) => s.role);
  const setRole = useUi((s) => s.setRole);
  const roles: Role[] = ['Clinician', 'Coder', 'Admin'];
  return (
    <DM.Root>
      <Tooltip content={`${CLINICIAN.fullName} (${role})`} side="right">
        <DM.Trigger asChild>
          <button aria-label={`Account menu, ${CLINICIAN.fullName}, role ${role}`} className="rounded-full focus-visible:outline-none focus-visible:shadow-focus">
            <Avatar name={CLINICIAN.fullName} size="lg" />
          </button>
        </DM.Trigger>
      </Tooltip>
      <DM.Portal>
        <DM.Content side="right" align="end" sideOffset={10} className="z-[70] w-60 rounded-md border border-line bg-surface p-1 shadow-modal">
          <DM.Label className="px-3 py-2">
            <p className="text-body font-medium text-fg">{CLINICIAN.fullName}</p>
            <p className="text-caption text-fg-secondary">{CLINICIAN.specialty}</p>
          </DM.Label>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Label className="px-3 py-1 text-caption text-fg-tertiary">View as role</DM.Label>
          <DM.RadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
            {roles.map((r) => (
              <DM.RadioItem
                key={r}
                value={r}
                className="flex h-9 cursor-pointer items-center justify-between rounded-sm px-3 text-body text-fg outline-none data-[highlighted]:bg-primary-subtle"
              >
                {r}
                <DM.ItemIndicator>
                  <Check size={16} className="text-primary" aria-hidden />
                </DM.ItemIndicator>
              </DM.RadioItem>
            ))}
          </DM.RadioGroup>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item
            onSelect={() => {
              resetDemo();
              toast({ tone: 'success', title: 'Demo data reset' });
            }}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-sm px-3 text-body text-fg outline-none data-[highlighted]:bg-primary-subtle"
          >
            <RotateCcw size={16} aria-hidden /> Reset demo data
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function Rail() {
  const toggleLang = useUi((s) => s.toggleLang);
  const lang = useUi((s) => s.lang);
  const setPalette = useUi((s) => s.setPalette);
  return (
    <nav
      aria-label="Main"
      className="glass sticky top-4 z-30 m-4 mr-0 flex h-[calc(100vh-var(--space-800))] w-rail shrink-0 flex-col items-center rounded-xl border border-line py-5 shadow-xs max-md:hidden"
    >
      <LogoMark className="mb-12" />
      <div className="flex flex-col items-center gap-2">
        <NavItem to="/" end label="Home" icon={<Home size={24} />} />
        <NavItem to="/m/agents" label="Agents" icon={<Asterisk size={24} />} />
        <NavItem label="Search (Ctrl K)" onClick={() => setPalette(true)} icon={<Search size={24} />} />
        <NavItem to="/m/campaigns" label="Patient outreach" icon={<Megaphone size={24} />} />
        <NavItem to="/m/patients" label="Patients" icon={<User size={24} />} />
        <NavItem to="/m/notifications" label="Notifications" icon={<Bell size={24} />} />
      </div>
      <div className="mt-auto flex flex-col items-center gap-4">
        <NavItem label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'} onClick={toggleLang} icon={<Languages size={24} />} />
        <AvatarMenu />
      </div>
    </nav>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  const forced = useUi((s) => s.forcedOffline);
  if (online && !forced) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-body-sm text-warning-text glass">
      <WifiOff size={16} aria-hidden />
      You are offline. Changes are queued and will sync when you reconnect.
      <span className="rounded-full bg-surface px-2 text-caption">Will sync</span>
    </div>
  );
}

/** 15 min idle on the dashboard shows a lock overlay (one click to continue). */
export function IdleLock() {
  const locked = useUi((s) => s.locked);
  const setLocked = useUi((s) => s.setLocked);
  const { pathname } = useLocation();
  const last = useRef(Date.now());
  useEffect(() => {
    const bump = () => (last.current = Date.now());
    const evs = ['pointermove', 'keydown', 'pointerdown', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = setInterval(() => {
      if (pathname === '/' && Date.now() - last.current > DEMO_CONFIG.idleLockMinutes * 60000) setLocked(true);
    }, 15000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(id);
    };
  }, [pathname, setLocked]);
  if (!locked) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lock-title" className="fixed inset-0 z-[95] flex items-center justify-center bg-scrim backdrop-blur-lg">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-surface p-8 text-center shadow-modal">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Lock size={24} aria-hidden />
        </span>
        <h2 id="lock-title" className="text-h2 font-medium">Session paused for privacy</h2>
        <p className="text-body text-fg-secondary">You were away for {DEMO_CONFIG.idleLockMinutes} minutes. Patient data is hidden until you continue.</p>
        <Button autoFocus onClick={() => setLocked(false)}>
          Continue as {CLINICIAN.name}
        </Button>
      </div>
    </div>
  );
}

export function SmallScreenNote() {
  const small = useMediaQuery(BELOW_MD);
  if (!small) return null;
  return (
    <p className="mx-4 mt-4 rounded-md bg-info-bg px-3 py-2 text-body-sm text-fg">
      Medexa is best on a larger screen. Everything still works here.
    </p>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  useKeydown((e) => {
    if (e.key.toLowerCase() === 'h' && e.altKey) navigate('/');
  });
  return (
    <div className="flex min-h-full">
      <a href="#main" className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 text-fg-on-dark">
        Skip to content
      </a>
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <SmallScreenNote />
        <main id="main" className={cn('flex-1 px-4 pb-6 md:px-6')}>
          <Outlet />
        </main>
        <footer className="flex items-center justify-between gap-3 px-6 pb-4">
          <DemoBadge />
          <span className="text-caption text-fg-tertiary">Shift+D Demo director · Ctrl K Command palette</span>
        </footer>
      </div>
    </div>
  );
}
