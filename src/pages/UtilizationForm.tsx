import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Loader2,
  Info,
  Upload,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { getAllMachines, getMachineById } from '@/services/workshop-service';
import {
  createUtilizationRequest,
  checkRecentSafetyAcknowledgement,
} from '@/services/utilization-service';
import { acknowledgeSafety } from '@/services/booking-service';
import SafetyAudioPlayer from '@/components/safety/SafetyAudioPlayer';
import type { Machine, TeamName } from '@/types/database';
import { TEAM_LABELS } from '@/types/database';
import { isProfileComplete } from '@/pages/StudentProfile';
import { supabase } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_OPTIONS = [
  { value: 'final_year_project', label: 'Final Year Project' },
  { value: 'team_project', label: 'Team Project' },
  { value: 'other', label: 'Other' },
] as const;

const MATERIAL_OPTIONS = [
  { value: 'self_purchased', label: 'Own' },
  { value: 'workshop_provided', label: 'Workshop' },
] as const;

type FormWorkType = 'final_year_project' | 'team_project' | 'other';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const utilizationSchema = z
  .object({
    work_type: z.enum(['final_year_project', 'team_project', 'other'], {
      required_error: 'Select a work type',
    }),
    // Final Year Project
    team_name_text: z.string().optional(),
    // Team Project
    team_selection: z.string().optional(),
    // Material source (FYP + Team)
    material_source: z.enum(['self_purchased', 'workshop_provided']).optional(),
    // Other
    work_description: z.string().optional(),
    // Time slot
    date: z.date({ required_error: 'Select a date' }),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  })
  .refine(
    (d) => {
      if (d.work_type === 'final_year_project') return !!d.team_name_text?.trim();
      return true;
    },
    { message: 'Team name is required', path: ['team_name_text'] },
  )
  .refine(
    (d) => {
      if (d.work_type === 'team_project') return !!d.team_selection;
      return true;
    },
    { message: 'Select a team', path: ['team_selection'] },
  )
  .refine(
    (d) => {
      if (d.work_type === 'final_year_project' || d.work_type === 'team_project')
        return !!d.material_source;
      return true;
    },
    { message: 'Select material source', path: ['material_source'] },
  )
  .refine(
    (d) => {
      if (d.work_type === 'other') return !!d.work_description?.trim();
      return true;
    },
    { message: 'Description is required', path: ['work_description'] },
  );

type FormValues = z.infer<typeof utilizationSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins : null;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function machineStatusColor(status: Machine['status']) {
  switch (status) {
    case 'available':
      return 'border-emerald-500/40 text-emerald-400';
    case 'busy':
    case 'reserved':
      return 'border-amber-500/40 text-amber-400';
    case 'maintenance':
      return 'border-red-500/40 text-red-400';
    default:
      return 'border-border text-muted-foreground';
  }
}

async function uploadPermissionLetter(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `permission-letters/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('File upload failed: ' + error.message);
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Machine Card ─────────────────────────────────────────────────────────────

function MachineCard({
  machine,
  selected,
  onSelect,
}: {
  machine: Machine;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = machine.status === 'maintenance';
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={cn(
        'text-left p-4 rounded-xl border-2 transition-all duration-200',
        'bg-muted/20 hover:bg-muted/40',
        disabled && 'opacity-40 cursor-not-allowed',
        selected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'border-white/10 hover:border-white/20',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Cpu className="h-4 w-4 text-primary" />
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] capitalize shrink-0', machineStatusColor(machine.status))}
        >
          {machine.status}
        </Badge>
      </div>
      <h3 className="text-sm font-semibold leading-tight truncate">{machine.name}</h3>
      {machine.shop_type && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{machine.shop_type}</p>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UtilizationForm() {
  const { machine_id: urlMachineId } = useParams<{ machine_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthStore();
  const { toast } = useToast();

  // ── Machine selection ───────────────────────────────────────────────
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    urlMachineId || null,
  );
  const [machineSearch, setMachineSearch] = useState('');

  // ── Permission letter file ──────────────────────────────────────────
  const [permissionFile, setPermissionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Safety state ────────────────────────────────────────────────────
  const [safetyCleared, setSafetyCleared] = useState(false);
  const [safetyLoading, setSafetyLoading] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────

  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['all-machines'],
    queryFn: getAllMachines,
    staleTime: 60_000,
  });

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? null;

  // If URL has a machine_id, also fetch it directly
  const { data: urlMachine, isLoading: urlMachineLoading } = useQuery({
    queryKey: ['machine', urlMachineId],
    queryFn: () => getMachineById(urlMachineId!),
    enabled: !!urlMachineId,
  });

  const activeMachine = selectedMachine || (urlMachineId ? urlMachine : null) || null;

  const { data: recentSafety, refetch: refetchSafety } = useQuery({
    queryKey: ['recent-safety', selectedMachineId],
    queryFn: () => checkRecentSafetyAcknowledgement(selectedMachineId!),
    enabled: !!selectedMachineId,
  });

  // Sync safety status with query result
  useEffect(() => {
    setSafetyCleared(!!recentSafety);
  }, [recentSafety]);

  // Reset safety when machine changes
  useEffect(() => {
    setSafetyCleared(false);
  }, [selectedMachineId]);

  // Machine search filter
  const filteredMachines = machineSearch.trim()
    ? machines.filter(
        (m) =>
          m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
          m.shop_type?.toLowerCase().includes(machineSearch.toLowerCase()),
      )
    : machines;

  // ── Form ────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(utilizationSchema),
    defaultValues: {
      work_type: undefined,
      team_name_text: '',
      team_selection: undefined,
      material_source: undefined,
      work_description: '',
      date: undefined,
      start_time: '',
      end_time: '',
    },
  });

  const workType = watch('work_type') as FormWorkType | undefined;
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const duration = computeDuration(startTime, endTime);

  // ── Safety acknowledgement handler ──────────────────────────────────

  const handleAcknowledgeSafety = useCallback(async () => {
    if (!selectedMachineId) return;
    setSafetyLoading(true);
    try {
      await acknowledgeSafety(selectedMachineId);
      await refetchSafety();
      setSafetyCleared(true);
      toast({ title: 'Safety acknowledged', description: 'You can now submit your request.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSafetyLoading(false);
    }
  }, [selectedMachineId, refetchSafety, toast]);

  // ── Submission ──────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedMachineId) throw new Error('Please select a machine');
      if (!safetyCleared) throw new Error('Please complete safety acknowledgement first');
      if (values.work_type === 'final_year_project' && !permissionFile) {
        throw new Error('Please upload a permission letter');
      }

      let permissionUrl = '';
      if (values.work_type === 'final_year_project' && permissionFile) {
        permissionUrl = await uploadPermissionLetter(permissionFile, user!.id);
      }

      // Derive team_name for DB column
      const teamName =
        values.work_type === 'team_project'
          ? values.team_selection
          : values.work_type === 'final_year_project'
            ? values.team_name_text
            : undefined;

      return createUtilizationRequest({
        machine_id: selectedMachineId,
        work_type: values.work_type,
        work_description: values.work_description,
        raw_material_source: values.material_source || 'self_purchased',
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.start_time,
        end_time: values.end_time,
        safety_acknowledged: true,
        // Identity from profile — NOT from form inputs
        roll_number: profile?.roll_number || undefined,
        branch: profile?.branch || undefined,
        year: profile?.year || undefined,
        division: profile?.division || undefined,
        batch: profile?.batch || undefined,
        team_name: teamName,
        permission_letter_url: permissionUrl || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Request submitted!',
        description: 'Your utilization request is pending approval.',
      });
      navigate('/dashboard');
    },
    onError: (err: Error) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    },
  });

  const onSubmit = (values: FormValues) => submitMutation.mutate(values);

  // ─── Guards ─────────────────────────────────────────────────────────

  if (urlMachineId && urlMachineLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (urlMachineId && !urlMachine && !urlMachineLoading) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Machine not found</p>
        <Button asChild variant="outline">
          <Link to="/workshop">Back to Workshop</Link>
        </Button>
      </div>
    );
  }

  // Profile completeness gate → redirect to profile page
  if (!isProfileComplete(profile)) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 px-4">
        <Info className="h-12 w-12 text-primary" />
        <p className="text-lg font-medium text-center">Complete your profile first</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Your roll number, branch, year and other details are required before submitting a
          utilization request.
        </p>
        <Button onClick={() => navigate('/profile', { state: { returnTo: location.pathname } })}>
          Complete Profile
        </Button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  const canSubmit =
    !!selectedMachineId &&
    safetyCleared &&
    !submitMutation.isPending &&
    activeMachine?.status !== 'maintenance';

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/workshop">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Workshop
            </Link>
          </Button>
          <h1 className="text-2xl font-bold mb-1">Machine Utilization Request</h1>
          <p className="text-sm text-muted-foreground">
            Select a machine, fill in work details, and submit your request.
          </p>
        </div>

        {/* ═══ Section 1: Machine Grid ═══ */}
        <section className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold shrink-0">Select Machine</h2>
            <div className="relative w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                placeholder="Search machines…"
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {machinesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {machineSearch ? 'No machines match your search.' : 'No machines available.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMachines.map((m) => (
                <MachineCard
                  key={m.id}
                  machine={m}
                  selected={selectedMachineId === m.id}
                  onSelect={() => setSelectedMachineId(m.id)}
                />
              ))}
            </div>
          )}

          {/* Selected machine info banner */}
          {activeMachine && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{activeMachine.name}</span>
                {activeMachine.shop_type && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {activeMachine.shop_type}
                  </span>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn('text-xs capitalize', machineStatusColor(activeMachine.status))}
              >
                {activeMachine.status}
              </Badge>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ═══ Section 2: Work Type ═══ */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Work Details</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="work_type">Work Type *</Label>
                <Controller
                  name="work_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger id="work_type" className="mt-1.5" aria-label="Work type">
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {WORK_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.work_type && (
                  <p className="text-xs text-destructive mt-1">{errors.work_type.message}</p>
                )}
              </div>

              {/* ═══ Section 3: Conditional Fields ═══ */}

              {/* Final Year Project fields */}
              {workType === 'final_year_project' && (
                <div className="space-y-4 p-4 rounded-lg bg-muted/10 border border-white/5 fade-in">
                  <div>
                    <Label htmlFor="team_name_text">Team / Project Name *</Label>
                    <Input
                      id="team_name_text"
                      {...register('team_name_text')}
                      className="mt-1.5"
                      placeholder="Enter your team or project name"
                    />
                    {errors.team_name_text && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.team_name_text.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Permission Letter *</Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'mt-1.5 flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                        permissionFile
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-white/10 hover:border-white/20 bg-muted/10',
                      )}
                    >
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">
                        {permissionFile ? permissionFile.name : 'Click to upload permission letter'}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setPermissionFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Word, or image formats accepted
                    </p>
                  </div>

                  <div>
                    <Label>Material Source *</Label>
                    <Controller
                      name="material_source"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1.5" aria-label="Material source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {MATERIAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.material_source && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.material_source.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Team Project fields */}
              {workType === 'team_project' && (
                <div className="space-y-4 p-4 rounded-lg bg-muted/10 border border-white/5 fade-in">
                  <div>
                    <Label htmlFor="team_selection">Team *</Label>
                    <Controller
                      name="team_selection"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger id="team_selection" className="mt-1.5" aria-label="Team">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {(Object.keys(TEAM_LABELS) as TeamName[]).map((key) => (
                              <SelectItem key={key} value={key}>
                                {TEAM_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.team_selection && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.team_selection.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Material Source *</Label>
                    <Controller
                      name="material_source"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1.5" aria-label="Material source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {MATERIAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.material_source && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.material_source.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Other — description */}
              {workType === 'other' && (
                <div className="p-4 rounded-lg bg-muted/10 border border-white/5 fade-in">
                  <Label htmlFor="work_description">Description *</Label>
                  <Textarea
                    id="work_description"
                    {...register('work_description')}
                    placeholder="Describe the work you'll be performing…"
                    className="mt-1.5"
                    rows={3}
                  />
                  {errors.work_description && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.work_description.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 4: Time Slot ═══ */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Time Slot</h3>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <Label>Date *</Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => {
                    const [calOpen, setCalOpen] = useState(false);
                    return (
                      <Popover open={calOpen} onOpenChange={setCalOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal mt-1.5',
                              !field.value && 'text-muted-foreground',
                            )}
                            aria-label="Select date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[70]" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(day) => {
                              field.onChange(day);
                              setCalOpen(false);
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errors.date && (
                  <p className="text-xs text-destructive mt-1">{errors.date.message}</p>
                )}
              </div>

              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...register('start_time')}
                    className="mt-1.5"
                    aria-label="Start time"
                  />
                  {errors.start_time && (
                    <p className="text-xs text-destructive mt-1">{errors.start_time.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...register('end_time')}
                    className="mt-1.5"
                    aria-label="End time"
                  />
                  {errors.end_time && (
                    <p className="text-xs text-destructive mt-1">{errors.end_time.message}</p>
                  )}
                </div>
              </div>

              {/* Duration display */}
              {duration && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estimated Duration:</span>
                  <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 5: Safety Status Box ═══ */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Safety Clearance
            </h3>

            {!selectedMachineId ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Select a machine above to check safety status.
              </p>
            ) : safetyCleared ? (
              /* ── Green: Safety valid ── */
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Safety Clearance Valid</p>
                  <p className="text-xs text-muted-foreground">
                    Your safety acknowledgement is active. You may submit your request.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Red: Safety expired / not done ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Safety Clearance Required</p>
                    <p className="text-xs text-muted-foreground">
                      You must complete the safety module for this machine before submitting.
                    </p>
                  </div>
                </div>

                {/* Audio player if machine has audio */}
                {activeMachine?.audio_explanation_url ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Listen to the complete safety audio below. You cannot skip or fast-forward.
                    </p>
                    <SafetyAudioPlayer
                      module={{
                        id: `machine-${activeMachine.id}`,
                        title: `${activeMachine.name} Safety`,
                        safety_type: 'machine',
                        resource_id: null,
                        shop_name: activeMachine.shop_type,
                        audio_url: activeMachine.audio_explanation_url,
                        audio_duration_seconds: 0,
                        validity_days: 30,
                        active: true,
                        created_at: '',
                        updated_at: '',
                      }}
                      onAcknowledged={handleAcknowledgeSafety}
                    />
                  </div>
                ) : (
                  /* Fallback: simple acknowledge button */
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      By clicking below you confirm you have read and understood all safety
                      guidelines and SOPs for this machine.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAcknowledgeSafety}
                      disabled={safetyLoading}
                    >
                      {safetyLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Acknowledging…
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" /> Acknowledge Safety
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ═══ Submit ═══ */}
          <div className="fixed bottom-0 left-0 right-0 z-30 glass-panel-strong border-t border-white/10 p-4 md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="container max-w-3xl flex items-center justify-between gap-4">
              <div className="hidden md:block text-xs text-muted-foreground">
                {duration && activeMachine
                  ? `${formatDuration(duration)} on ${activeMachine.name}`
                  : !selectedMachineId
                    ? 'Select a machine to begin'
                    : !safetyCleared
                      ? 'Complete safety clearance to submit'
                      : 'Complete all fields to submit'}
              </div>
              <Button type="submit" size="lg" className="w-full md:w-auto" disabled={!canSubmit}>
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                  </>
                ) : (
                  'Submit Utilization Request'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
