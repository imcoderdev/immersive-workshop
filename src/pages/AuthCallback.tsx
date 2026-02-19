import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/auth?error=callback_failed');
        return;
      }

      if (session) {
        await fetchProfile();
        // Check if there's a redirect URL stored
        const redirectTo = sessionStorage.getItem('dsw_redirect_after_auth');
        sessionStorage.removeItem('dsw_redirect_after_auth');
        navigate(redirectTo || '/dashboard');
      } else {
        navigate('/auth');
      }
    };

    handleCallback();
  }, [navigate, fetchProfile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
