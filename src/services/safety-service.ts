import { supabase } from '@/lib/supabase';
import type {
  SafetyModule,
  SafetyModuleAcknowledgement,
} from '@/types/database';

// ─── Safety Modules ───────────────────────────────────────────────────────────

export async function getAllSafetyModules(): Promise<SafetyModule[]> {
  const { data, error } = await supabase
    .from('safety_modules')
    .select('*')
    .order('title');
  if (error) throw error;
  return data as SafetyModule[];
}

export async function getActiveSafetyModules(): Promise<SafetyModule[]> {
  const { data, error } = await supabase
    .from('safety_modules')
    .select('*')
    .eq('active', true)
    .order('title');
  if (error) throw error;
  return data as SafetyModule[];
}

export async function getSafetyModulesForResource(resourceId: string): Promise<SafetyModule[]> {
  const { data, error } = await supabase
    .from('safety_modules')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('active', true)
    .order('title');
  if (error) throw error;
  return data as SafetyModule[];
}

export async function getSafetyModulesForShop(shopName: string): Promise<SafetyModule[]> {
  const { data, error } = await supabase
    .from('safety_modules')
    .select('*')
    .eq('shop_name', shopName)
    .eq('safety_type', 'shop')
    .eq('active', true)
    .order('title');
  if (error) throw error;
  return data as SafetyModule[];
}

export async function createSafetyModule(payload: Partial<SafetyModule>): Promise<SafetyModule> {
  const { data, error } = await supabase
    .from('safety_modules')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as SafetyModule;
}

export async function updateSafetyModule(
  id: string,
  updates: Partial<SafetyModule>,
): Promise<SafetyModule> {
  const { data, error } = await supabase
    .from('safety_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SafetyModule;
}

export async function deleteSafetyModule(id: string): Promise<void> {
  const { error } = await supabase.from('safety_modules').delete().eq('id', id);
  if (error) throw error;
}

// ─── Safety Module Acknowledgements ───────────────────────────────────────────

export async function getUserSafetyModuleAcks(): Promise<SafetyModuleAcknowledgement[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('safety_module_acknowledgements')
    .select('*')
    .eq('user_id', user.id)
    .order('acknowledged_at', { ascending: false });
  if (error) throw error;
  return data as SafetyModuleAcknowledgement[];
}

export async function checkSafetyModuleValidity(
  safetyModuleId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('safety_module_acknowledgements')
    .select('id, expires_at')
    .eq('user_id', user.id)
    .eq('safety_module_id', safetyModuleId)
    .eq('playback_duration_verified', true)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** Check if user has valid acknowledgements for ALL active modules of a resource */
export async function checkResourceSafetyValidity(resourceId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Get all active safety modules for this resource
  const modules = await getSafetyModulesForResource(resourceId);
  if (modules.length === 0) return true; // No safety modules → considered valid

  const now = new Date().toISOString();

  for (const mod of modules) {
    const { data } = await supabase
      .from('safety_module_acknowledgements')
      .select('id')
      .eq('user_id', user.id)
      .eq('safety_module_id', mod.id)
      .eq('playback_duration_verified', true)
      .gte('expires_at', now)
      .limit(1)
      .maybeSingle();

    if (!data) return false; // At least one module not acknowledged
  }
  return true;
}

/** Check if user has valid shop safety */
export async function checkShopSafetyValidity(shopName: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const modules = await getSafetyModulesForShop(shopName);
  if (modules.length === 0) return true;

  const now = new Date().toISOString();

  for (const mod of modules) {
    const { data } = await supabase
      .from('safety_module_acknowledgements')
      .select('id')
      .eq('user_id', user.id)
      .eq('safety_module_id', mod.id)
      .eq('playback_duration_verified', true)
      .gte('expires_at', now)
      .limit(1)
      .maybeSingle();

    if (!data) return false;
  }
  return true;
}

export async function acknowledgeSafetyModule(input: {
  safetyModuleId: string;
  playbackStartedAt: string;
  playbackEndedAt: string;
  playbackDurationVerified: boolean;
  validityDays: number;
}): Promise<SafetyModuleAcknowledgement> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.validityDays);

  const { data, error } = await supabase
    .from('safety_module_acknowledgements')
    .insert({
      user_id: user.id,
      safety_module_id: input.safetyModuleId,
      acknowledged_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      playback_duration_verified: input.playbackDurationVerified,
      playback_started_at: input.playbackStartedAt,
      playback_ended_at: input.playbackEndedAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SafetyModuleAcknowledgement;
}
