import { clock } from '../../engine/clock';
import { usePipeline } from '../../engine/pipeline';
import { useDemo } from '../../store/demo';
import { useSession } from '../../store/session';
import { useUi } from '../../store/ui';

export function resetDemo() {
  clock.reset();
  clock.setSpeed(1);
  useUi.getState().setSpeed(1);
  useSession.getState().end();
  usePipeline.getState().reset();
  useDemo.getState().reset();
}
