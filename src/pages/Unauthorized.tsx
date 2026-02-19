import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export default function Unauthorized() {
  const { profile } = useAuthStore();

  if (!profile) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold gradient-text mb-4">403</div>
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Your current role is{' '}
          <span className="text-primary font-medium">{profile.role}</span>.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
