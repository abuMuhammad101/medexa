import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import * as RTooltip from '@radix-ui/react-tooltip';
import { Toaster } from './components/ui';
import { clock } from './engine/clock';
import { usePipelineDriver } from './engine/pipeline';
import { AppShell, IdleLock } from './features/shell/AppShell';
import { CommandPalette } from './features/shell/CommandPalette';
import { DemoDirector } from './features/shell/DemoDirector';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EncountersPage } from './features/dashboard/EncountersPage';
import { SessionPage } from './features/session/SessionPage';
import { ReviewPage } from './features/review/ReviewPage';
import { KitPage } from './routes/KitPage';
import { ErrorBoundary, NotFound, NotInDemo } from './routes/Misc';
import { useUi } from './store/ui';

function Globals() {
  usePipelineDriver();
  const theme = useUi((s) => s.theme);
  const speed = useUi((s) => s.speed);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (clock.speed !== speed) clock.setSpeed(speed);
  }, [speed]);
  return (
    <>
      <Toaster />
      <DemoDirector />
      <CommandPalette />
      <IdleLock />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <RTooltip.Provider delayDuration={250}>
          {/* basename follows Vite's base ("/" locally, "/medexa/" on GitHub Pages) */}
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Globals />
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="encounters" element={<EncountersPage />} />
                <Route path="session/:id" element={<SessionPage />} />
                <Route path="kit" element={<KitPage />} />
                <Route path="m/:module" element={<NotInDemo />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="review/:id/:step" element={<ReviewPage />} />
            </Routes>
          </BrowserRouter>
        </RTooltip.Provider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
