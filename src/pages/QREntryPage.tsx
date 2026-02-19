import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

/**
 * QR Entry Flow:
 * 1. User scans QR → /enter?workshop_id=ID
 * 2. If unauthenticated → redirect to /auth, store workshop_id
 * 3. After login → redirect to /workshop?id=ID
 */
export default function QREntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();

  const workshopId = searchParams.get('workshop_id');

  useEffect(() => {
    if (isLoading) return;

    if (!workshopId) {
      navigate('/', { replace: true });
      return;
    }

    if (!user) {
      // Store redirect for after auth
      sessionStorage.setItem('dsw_redirect_after_auth', `/workshop?id=${workshopId}`);
      navigate('/auth', { replace: true });
      return;
    }

    // Authenticated → go to viewer
    navigate(`/workshop?id=${workshopId}`, { replace: true });
  }, [user, isLoading, workshopId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Entering workshop...</p>
      </div>
    </div>
  );
}
