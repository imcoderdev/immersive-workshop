import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  ShieldAlert,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getActiveSessions,
  markAttendance,
  checkMyAttendance,
} from '@/services/practical-service';
import {
  checkShopSafetyValidity,
  getSafetyModulesForShop,
} from '@/services/safety-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import SafetyAudioPlayer from '@/components/safety/SafetyAudioPlayer';
import type { PracticalSessionDetail, SafetyModule } from '@/types/database';

export default function PracticalModule() {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const division = profile?.division ?? '';
  const batch = profile?.batch ?? '';

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['active-practical-sessions', division, batch],
    queryFn: () => getActiveSessions({ division, batch }),
    enabled: !!division && !!batch,
  });

  // ─── Session Card State ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">First Year Practical</h1>
          <p className="text-sm text-muted-foreground">
            Mark attendance for your active practical sessions. Safety acknowledgement is required before attendance.
          </p>
          {profile && (
            <p className="text-xs text-muted-foreground mt-1">
              Division: <span className="font-medium text-foreground">{division || '—'}</span>
              {' · '}Batch: <span className="font-medium text-foreground">{batch || '—'}</span>
            </p>
          )}
        </div>

        {!division || !batch ? (
          <div className="glass-panel rounded-xl p-8 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-muted-foreground">
              Your profile is missing division and batch information. Please update your profile or contact admin.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No active practical sessions for your division &amp; batch right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: PracticalSessionDetail }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [comment, setComment] = useState('');
  const [showSafety, setShowSafety] = useState(false);

  // Check if already attended
  const { data: alreadyAttended, isLoading: checkingAttendance } = useQuery({
    queryKey: ['my-attendance', session.id],
    queryFn: () => checkMyAttendance(session.id),
  });

  // Check shop safety validity
  const shopName = session.shop_name ?? session.shop_label ?? '';
  const { data: safetyValid, isLoading: checkingSafety } = useQuery({
    queryKey: ['safety-validity', 'shop', shopName],
    queryFn: () => checkShopSafetyValidity(shopName),
    enabled: !!shopName,
  });

  // Get safety modules for the shop if safety is not valid
  const { data: safetyModules = [] } = useQuery({
    queryKey: ['safety-modules-shop', shopName],
    queryFn: () => getSafetyModulesForShop(shopName),
    enabled: !!shopName && safetyValid === false,
  });

  // Track which safety modules have been acknowledged in this session
  const [ackedModuleIds, setAckedModuleIds] = useState<Set<string>>(new Set());
  const allSafetyDone = safetyValid || (safetyModules.length > 0 && safetyModules.every((m) => ackedModuleIds.has(m.id)));

  // Mark attendance mutation
  const attendMut = useMutation({
    mutationFn: () => markAttendance({ sessionId: session.id, optionalComment: comment || undefined }),
    onSuccess: () => {
      toast({ title: 'Attendance marked!' });
      queryClient.invalidateQueries({ queryKey: ['my-attendance', session.id] });
      queryClient.invalidateQueries({ queryKey: ['active-practical-sessions'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleAck = (moduleId: string) => {
    setAckedModuleIds((prev) => new Set([...prev, moduleId]));
    queryClient.invalidateQueries({ queryKey: ['safety-validity', 'shop', shopName] });
  };

  const loading = checkingAttendance || checkingSafety;

  return (
    <div className="glass-panel rounded-xl p-6 border border-border/30">
      {/* Session info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">{session.topic}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>{session.shop_name ?? session.shop_label}</span>
            <span>·</span>
            <span>Faculty: {session.faculty_name}</span>
            <span>·</span>
            <span>{format(new Date(session.date), 'MMM d, yyyy')}</span>
            {session.start_time && (
              <>
                <span>·</span>
                <span>{session.start_time.slice(0, 5)}{session.end_time ? ` – ${session.end_time.slice(0, 5)}` : ''}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Division: {session.division} · Batch: {session.batch} · Attendance: {session.attendance_count}
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
          Active
        </span>
      </div>

      {/* Already attended */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </div>
      ) : alreadyAttended ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="text-sm font-medium text-success">Attendance already marked</span>
        </div>
      ) : (
        <>
          {/* Safety check */}
          {!allSafetyDone && (
            <div className="mb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">
                  Shop safety acknowledgement required before marking attendance
                </span>
              </div>

              {!showSafety ? (
                <Button variant="outline" size="sm" onClick={() => setShowSafety(true)}>
                  <ShieldAlert className="h-4 w-4 mr-1" /> Complete Safety Module
                </Button>
              ) : (
                <div className="space-y-4">
                  {safetyModules.map((mod) => (
                    <SafetyAudioPlayer
                      key={mod.id}
                      module={mod}
                      alreadyValid={ackedModuleIds.has(mod.id)}
                      onAcknowledged={() => handleAck(mod.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance form */}
          {allSafetyDone && (
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder="Optional comment (e.g. experiment number)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                onClick={() => attendMut.mutate()}
                disabled={attendMut.isPending}
                className="w-fit"
              >
                {attendMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Mark Attendance
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
