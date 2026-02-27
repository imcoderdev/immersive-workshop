import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Global Supabase Realtime → TanStack Query bridge.
 *
 * Subscribes to postgres_changes on all key tables and
 * auto-invalidates the corresponding query keys so the UI
 * updates without a manual page refresh.
 *
 * Mount this hook ONCE at the app root (inside QueryClientProvider).
 */
export function useRealtimeInvalidation() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-db-changes')

      // ── machine_utilization_requests ──────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machine_utilization_requests' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Student sees status updates, supervisor sees new/changed requests
          qc.invalidateQueries({ queryKey: ['user-utilization'] });
          qc.invalidateQueries({ queryKey: ['supervisor-utilization'] });
          qc.invalidateQueries({ queryKey: ['supervisor-stats'] });
          qc.invalidateQueries({ queryKey: ['admin-utilization'] });
          qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
      )

      // ── bookings ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['user-bookings'] });
          qc.invalidateQueries({ queryKey: ['all-bookings'] });
          qc.invalidateQueries({ queryKey: ['admin-stats'] });
          qc.invalidateQueries({ queryKey: ['weekly-usage'] });
          qc.invalidateQueries({ queryKey: ['machine-utilization'] });
        },
      )

      // ── machines ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machines' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['faculty-machines'] });
          qc.invalidateQueries({ queryKey: ['machines'] });
          qc.invalidateQueries({ queryKey: ['machine'] });
          qc.invalidateQueries({ queryKey: ['all-machines'] });
          qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
      )

      // ── profiles ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['all-profiles'] });
          qc.invalidateQueries({ queryKey: ['pending-teachers'] });
        },
      )

      // ── safety_acknowledgements ──────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_acknowledgements' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['user-safety'] });
          qc.invalidateQueries({ queryKey: ['recent-safety'] });
        },
      )

      // ── notifications ────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['notifications'] });
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
