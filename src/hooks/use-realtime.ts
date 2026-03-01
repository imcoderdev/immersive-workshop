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

      // ── resources ────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['resources'] });
          qc.invalidateQueries({ queryKey: ['resource-details'] });
          qc.invalidateQueries({ queryKey: ['shops'] });
          qc.invalidateQueries({ queryKey: ['maintenance-due'] });
          qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
      )

      // ── safety_modules ───────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_modules' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['safety-modules'] });
        },
      )

      // ── safety_module_acknowledgements ───────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_module_acknowledgements' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['safety-module-acks'] });
          qc.invalidateQueries({ queryKey: ['safety-validity'] });
        },
      )

      // ── practical_sessions ───────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practical_sessions' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['practical-sessions'] });
          qc.invalidateQueries({ queryKey: ['faculty-practicals'] });
        },
      )

      // ── practical_attendance ─────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practical_attendance' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['practical-attendance'] });
          qc.invalidateQueries({ queryKey: ['my-attendance'] });
        },
      )

      // ── tool_issue_requests ──────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tool_issue_requests' },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ['tool-issues'] });
          qc.invalidateQueries({ queryKey: ['user-tool-issues'] });
          qc.invalidateQueries({ queryKey: ['faculty-tool-issues'] });
          qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
      )

      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Global channel subscribed');
        }
        if (err) {
          console.error('[Realtime] Subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
