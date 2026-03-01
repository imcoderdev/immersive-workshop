import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, CheckCircle2, Loader2 } from 'lucide-react';
import type { SafetyModule } from '@/types/database';
import { acknowledgeSafetyModule } from '@/services/safety-service';

interface SafetyAudioPlayerProps {
  module: SafetyModule;
  onAcknowledged?: () => void;
  /** If true the user already has a valid acknowledgement — show green state */
  alreadyValid?: boolean;
}

/**
 * Audio-enforced safety player.
 * - Disables skip / fast-forward / playback-speed changes.
 * - Tracks actual playback time.
 * - Requires playback duration ≥ audio_duration_seconds before allowing ack.
 */
export default function SafetyAudioPlayer({
  module,
  onAcknowledged,
  alreadyValid = false,
}: SafetyAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<string | null>(null);
  const [accumulatedSec, setAccumulatedSec] = useState(0);
  const [ackLoading, setAckLoading] = useState(false);
  const [acked, setAcked] = useState(alreadyValid);
  const lastTimeRef = useRef(0);

  const requiredSeconds = module.audio_duration_seconds;

  // Prevent scrubbing — whenever seeked fires, reset to lastTimeRef
  const handleSeeked = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (Math.abs(el.currentTime - lastTimeRef.current) > 2) {
      el.currentTime = lastTimeRef.current;
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const t = el.currentTime;
    // Only accumulate if time moved forward naturally (< 2s jump)
    const delta = t - lastTimeRef.current;
    if (delta > 0 && delta < 2) {
      setAccumulatedSec((prev) => prev + delta);
    }
    lastTimeRef.current = t;
    setCurrent(t);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      setDuration(el.duration);
      // Force playback rate to 1x
      el.playbackRate = 1;
    }
  }, []);

  // Prevent playback rate changes
  const handleRateChange = useCallback(() => {
    const el = audioRef.current;
    if (el && el.playbackRate !== 1) el.playbackRate = 1;
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      if (!playbackStartedAt) setPlaybackStartedAt(new Date().toISOString());
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing, playbackStartedAt]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const canAcknowledge = accumulatedSec >= requiredSeconds && !acked;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const listeningProgress = requiredSeconds > 0 ? Math.min((accumulatedSec / requiredSeconds) * 100, 100) : 0;

  const handleAcknowledge = async () => {
    if (!canAcknowledge) return;
    setAckLoading(true);
    try {
      await acknowledgeSafetyModule({
        safetyModuleId: module.id,
        playbackStartedAt: playbackStartedAt || new Date().toISOString(),
        playbackEndedAt: new Date().toISOString(),
        playbackDurationVerified: true,
        validityDays: module.validity_days,
      });
      setAcked(true);
      onAcknowledged?.();
    } finally {
      setAckLoading(false);
    }
  };

  useEffect(() => {
    setAcked(alreadyValid);
  }, [alreadyValid]);

  if (acked) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <div>
          <div className="text-sm font-medium">{module.title}</div>
          <div className="text-xs text-muted-foreground">Safety acknowledged — valid for {module.validity_days} days</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
      <audio
        ref={audioRef}
        src={module.audio_url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
        onEnded={handleEnded}
        onRateChange={handleRateChange}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
        >
          {playing ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{module.title}</div>
          <div className="text-xs text-muted-foreground">
            {formatSec(currentTime)} / {formatSec(duration || requiredSeconds)}
          </div>
        </div>
        <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      {/* Audio progress bar (read-only) */}
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Listening progress */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Listening progress:</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              listeningProgress >= 100 ? 'bg-success' : 'bg-warning',
            )}
            style={{ width: `${listeningProgress}%` }}
          />
        </div>
        <span className={cn('font-medium', listeningProgress >= 100 ? 'text-success' : 'text-warning')}>
          {Math.round(listeningProgress)}%
        </span>
      </div>

      <Button
        size="sm"
        onClick={handleAcknowledge}
        disabled={!canAcknowledge || ackLoading}
        className="w-full"
      >
        {ackLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <CheckCircle2 className="h-4 w-4 mr-1" />
        )}
        {canAcknowledge ? 'Acknowledge Safety Module' : `Listen to full audio to acknowledge`}
      </Button>
    </div>
  );
}

function formatSec(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
