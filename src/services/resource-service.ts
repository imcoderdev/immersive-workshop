import { supabase } from '@/lib/supabase';
import type { Resource, ResourceDetail, ResourceType } from '@/types/database';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Resource[];
}

export async function getResourcesByType(type: ResourceType): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('resource_type', type)
    .order('name');
  if (error) throw error;
  return data as Resource[];
}

export async function getResourceById(id: string): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Resource;
}

export async function getResourceByName(name: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .ilike('name', name)
    .maybeSingle();
  if (error) throw error;
  return data as Resource | null;
}

export async function getResourceDetails(): Promise<ResourceDetail[]> {
  const { data, error } = await supabase
    .from('resource_details')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as ResourceDetail[];
}

export async function getResourcesByWorkshop(workshopId: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('name');
  if (error) throw error;
  return data as Resource[];
}

export async function getShops(): Promise<Resource[]> {
  return getResourcesByType('shop');
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createResource(payload: Partial<Resource>): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Resource;
}

export async function updateResource(id: string, updates: Partial<Resource>): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Resource;
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from('resources').delete().eq('id', id);
  if (error) throw error;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function markMaintenanceDone(id: string): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .update({
      last_maintenance_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Resource;
}

export async function getMaintenanceDueResources(): Promise<ResourceDetail[]> {
  const { data, error } = await supabase
    .from('resource_details')
    .select('*')
    .not('maintenance_interval_days', 'is', null)
    .not('last_maintenance_date', 'is', null)
    .order('name');
  if (error) throw error;
  // Filter client-side for due/overdue
  const today = new Date().toISOString().split('T')[0];
  return (data as ResourceDetail[]).filter(
    (r) => r.next_maintenance_due && r.next_maintenance_due <= today,
  );
}
