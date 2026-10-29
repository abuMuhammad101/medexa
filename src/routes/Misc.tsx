import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Compass, Construction, TriangleAlert } from 'lucide-react';
import { EmptyState } from '../components/ui';

const linkBtn =
  'inline-flex h-10 items-center rounded-full bg-primary px-5 text-body font-medium text-fg-on-dark hover:bg-primary-hover focus-visible:outline-none focus-visible:shadow-focus';

const MODULES: Record<string, string> = {
  agents: 'Agents',
  campaigns: 'Patient outreach',
  patients: 'Patients',
  notifications: 'Notifications',
};

export function NotInDemo() {
  const { module = '' } = useParams();
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl bg-surface shadow-xs">
      <EmptyState
        icon={<Construction size={24} aria-hidden />}
        title={`${MODULES[module] ?? 'This module'} is not in this demo`}
        body="This demo covers the Control room, Live Session and Review Assistant. The rest of Medexa is available in the full product."
        action={<Link to="/" className={linkBtn}>Back to Control room</Link>}
      />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl bg-surface shadow-xs">
      <EmptyState
        icon={<Compass size={24} aria-hidden />}
        title="Page not found"
        body="The link may be old, or the encounter was removed when demo data was reset."
        action={<Link to="/" className={linkBtn}>Back to dashboard</Link>}
      />
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Medexa demo error', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-lg rounded-xl bg-surface shadow-modal">
          <EmptyState
            icon={<TriangleAlert size={24} aria-hidden />}
            title="Something went wrong"
            body={this.state.error.message}
            action={
              <a href={import.meta.env.BASE_URL} className={linkBtn}>
                Back to dashboard
              </a>
            }
          />
        </div>
      </div>
    );
  }
}
