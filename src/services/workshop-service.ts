import { supabase } from '@/lib/supabase';
import type { Workshop, Panorama, Machine, Hotspot } from '@/types/database';

// ─── Workshops ────────────────────────────────────────────────────────────────

export async function getWorkshops(): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Workshop[];
}

export async function getWorkshopById(id: string): Promise<Workshop> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Workshop;
}

export async function createWorkshop(workshop: Partial<Workshop>): Promise<Workshop> {
  const { data, error } = await supabase
    .from('workshops')
    .insert(workshop)
    .select()
    .single();

  if (error) throw error;
  return data as Workshop;
}

export async function updateWorkshop(id: string, updates: Partial<Workshop>): Promise<Workshop> {
  const { data, error } = await supabase
    .from('workshops')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Workshop;
}

export async function deleteWorkshop(id: string): Promise<void> {
  const { error } = await supabase.from('workshops').delete().eq('id', id);
  if (error) throw error;
}

// ─── Panoramas ────────────────────────────────────────────────────────────────

export async function getPanoramasByWorkshop(workshopId: string): Promise<Panorama[]> {
  const { data, error } = await supabase
    .from('panoramas')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('sort_order');

  if (error) throw error;
  return data as Panorama[];
}

export async function createPanorama(panorama: Partial<Panorama>): Promise<Panorama> {
  const { data, error } = await supabase
    .from('panoramas')
    .insert(panorama)
    .select()
    .single();

  if (error) throw error;
  return data as Panorama;
}

export async function updatePanorama(id: string, updates: Partial<Panorama>): Promise<Panorama> {
  const { data, error } = await supabase
    .from('panoramas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Panorama;
}

export async function deletePanorama(id: string): Promise<void> {
  const { error } = await supabase.from('panoramas').delete().eq('id', id);
  if (error) throw error;
}

// ─── Machines ─────────────────────────────────────────────────────────────────

export async function getAllMachines(): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Machine[];
}

export async function getMachinesByWorkshop(workshopId: string): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('name');

  if (error) throw error;
  return data as Machine[];
}

export async function getMachineById(id: string): Promise<Machine> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Machine;
}

/** Find the first machine matching a given name (case-insensitive). */
export async function getMachineByName(name: string): Promise<Machine | null> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Machine | null;
}

export async function createMachine(machine: Partial<Machine>): Promise<Machine> {
  const { data, error } = await supabase
    .from('machines')
    .insert(machine)
    .select()
    .single();

  if (error) throw error;
  return data as Machine;
}

export async function updateMachine(id: string, updates: Partial<Machine>): Promise<Machine> {
  const { data, error } = await supabase
    .from('machines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Machine;
}

export async function deleteMachine(id: string): Promise<void> {
  const { error } = await supabase.from('machines').delete().eq('id', id);
  if (error) throw error;
}

// ─── Hotspots ─────────────────────────────────────────────────────────────────

export async function getHotspotsByPanorama(panoramaId: string): Promise<Hotspot[]> {
  const { data, error } = await supabase
    .from('hotspots')
    .select('*, machine:machines(*)')
    .eq('panorama_id', panoramaId);

  if (error) throw error;
  return data as Hotspot[];
}

export async function createHotspot(hotspot: Partial<Hotspot>): Promise<Hotspot> {
  const { data, error } = await supabase
    .from('hotspots')
    .insert(hotspot)
    .select()
    .single();

  if (error) throw error;
  return data as Hotspot;
}

export async function updateHotspot(id: string, updates: Partial<Hotspot>): Promise<Hotspot> {
  const { data, error } = await supabase
    .from('hotspots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Hotspot;
}

export async function deleteHotspot(id: string): Promise<void> {
  const { error } = await supabase.from('hotspots').delete().eq('id', id);
  if (error) throw error;
}
