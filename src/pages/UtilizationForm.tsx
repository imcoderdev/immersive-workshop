import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  FileText,
  Cpu,
  Loader2,
  Info,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { getMachineById, getMachineByName } from '@/services/workshop-service';
import {
  createUtilizationRequest,
  checkRecentSafetyAcknowledgement,
} from '@/services/utilization-service';
import { acknowledgeSafety } from '@/services/booking-service';
import type { WorkType, RawMaterialSource, StudentBranch, TeamName } from '@/types/database';
import {
  WORK_TYPE_LABELS,
  RAW_MATERIAL_LABELS,
  MACHINE_CATALOG,
  BRANCH_LABELS,
  TEAM_LABELS,
} from '@/types/database';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const utilizationSchema = z
  .object({
    roll_number: z.string().min(1, 'Roll number is required'),
    branch: z.string().min(1, 'Branch is required'),
    year: z.coerce.number().min(1).max(4, 'Year must be 1-4'),
    division: z.string().min(1, 'Division is required'),
    batch: z.string().min(1, 'Batch is required'),
    work_type: z.enum(['first_year_practical', 'team_project', 'final_year_project', 'academic_event', 'other'], {
      required_error: 'Select a work type',
    }),
    work_description: z.string().optional(),
    raw_material_source: z.enum(['workshop_provided', 'self_purchased'], {
      required_error: 'Select raw material source',
    }),
    date: z.date({ required_error: 'Select a date' }),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    safety_acknowledged: z.literal(true, {
      errorMap: () => ({ message: 'You must acknowledge safety rules' }),
    }),
    team_name: z.string().optional(),
    team_name_other: z.string().optional(),
    permission_letter_url: z.string().optional(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  })
  .refine(
    (d) => {
      if (d.work_type === 'other') return !!d.work_description?.trim();
      return true;
    },
    { message: 'Description is required when work type is "Other"', path: ['work_description'] },
  )
  .refine(
    (d) => {
      if (d.work_type === 'academic_event') return !!d.work_description?.trim();
      return true;
    },
    { message: 'Description is required for Academic Event', path: ['work_description'] },
  )
  .refine(
    (d) => {
      if (d.work_type === 'team_project' || d.work_type === 'final_year_project') return !!d.team_name;
      return true;
    },
    { message: 'Team name is required', path: ['team_name'] },
  );

type FormValues = z.infer<typeof utilizationSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins : null;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UtilizationForm() {
  const { machine_id: urlMachineId } = useParams<{ machine_id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { toast } = useToast();

  // Machine selection state — mirrors faculty catalog picker
  const [selectedCatalog, setSelectedCatalog] = useState<string>('');
  const [customMachineName, setCustomMachineName] = useState('');

  // SOP interaction tracking
  const sopContainerRef = useRef<HTMLDivElement>(null);
  const [sopScrolled, setSopScrolled] = useState(false);
  const [safetyCheckboxEnabled, setSafetyCheckboxEnabled] = useState(false);

  // Derive the name to look up — catalog name or custom name (on blur)
  const [committedCustomName, setCommittedCustomName] = useState('');
  const nameToResolve =
    selectedCatalog === '__other__'
      ? committedCustomName
      : selectedCatalog || '';

  // Resolve catalog / custom name → DB machine (useQuery = auto retry + cache)
  const {
    data: resolvedMachine,
    isLoading: resolving,
    isError: resolveError,
  } = useQuery({
    queryKey: ['machine-by-name', nameToResolve],
    queryFn: () => getMachineByName(nameToResolve),
    enabled: !!nameToResolve && !!profile,   // wait for auth
    retry: 2,
    staleTime: 30_000,
  });

  const resolvedMachineId = resolvedMachine?.id ?? null;
  const machineNotFound = !resolving && !!nameToResolve && !resolvedMachine && !resolveError;

  const activeMachineId = urlMachineId || resolvedMachineId || undefined;

  // When catalog selection changes
  const handleCatalogChange = useCallback((value: string) => {
    setSelectedCatalog(value);
    setSopScrolled(false);
    setSafetyCheckboxEnabled(false);
    if (value !== '__other__') {
      setCustomMachineName('');
      setCommittedCustomName('');
    }
  }, []);

  // For "Other" custom name — commit on blur so the query fires
  const handleCustomNameBlur = useCallback(() => {
    if (customMachineName.trim()) {
      setCommittedCustomName(customMachineName.trim());
    }
  }, [customMachineName]);

  // Queries
  const { data: machine, isLoading: machineLoading } = useQuery({
    queryKey: ['machine', activeMachineId],
    queryFn: () => getMachineById(activeMachineId!),
    enabled: !!activeMachineId,
  });

  const { data: recentSafety } = useQuery({
    queryKey: ['recent-safety', activeMachineId],
    queryFn: () => checkRecentSafetyAcknowledgement(activeMachineId!),
    enabled: !!activeMachineId,
  });

  // If user already acknowledged within 30 days, enable checkbox immediately
  useEffect(() => {
    if (recentSafety) {
      setSafetyCheckboxEnabled(true);
      setSopScrolled(true);
    }
  }, [recentSafety]);

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(utilizationSchema),
    defaultValues: {
      roll_number: profile?.roll_number || '',
      branch: profile?.branch || '',
      year: profile?.year || undefined,
      division: profile?.division || '',
      batch: profile?.batch || '',
      work_type: undefined,
      work_description: '',
      raw_material_source: undefined,
      date: undefined,
      start_time: '',
      end_time: '',
      safety_acknowledged: undefined,
      team_name: undefined,
      team_name_other: '',
      permission_letter_url: '',
    },
  });

  const workType = watch('work_type');
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const duration = computeDuration(startTime, endTime);

  // SOP scroll handler
  const handleSopScroll = useCallback(() => {
    const el = sopContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom && !sopScrolled) {
      setSopScrolled(true);
      setSafetyCheckboxEnabled(true);
    }
  }, [sopScrolled]);

  // Submission
  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeMachineId) throw new Error('Please select a machine');

      // Redirect first_year_practical to the practical module
      if (values.work_type === 'first_year_practical') {
        throw new Error('First Year Practicals must be submitted through the Practical Module by your faculty.');
      }

      // Record safety acknowledgement if not recently done
      if (!recentSafety) {
        await acknowledgeSafety(activeMachineId);
      }

      return createUtilizationRequest({
        machine_id: activeMachineId,
        work_type: values.work_type,
        work_description: values.work_description,
        raw_material_source: values.raw_material_source,
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.start_time,
        end_time: values.end_time,
        safety_acknowledged: true,
        roll_number: values.roll_number,
        branch: values.branch,
        year: values.year,
        division: values.division,
        batch: values.batch,
        team_name: values.team_name,
        team_name_other: values.team_name_other,
        permission_letter_url: values.permission_letter_url,
      });
    },
    onSuccess: () => {
      toast({ title: 'Request submitted!', description: 'Your utilization request is pending supervisor approval.' });
      navigate('/dashboard');
    },
    onError: (err: Error) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    },
  });

  const onSubmit = (values: FormValues) => submitMutation.mutate(values);

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (urlMachineId && machineLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (urlMachineId && !machine) {
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

  // Profile completeness check
  const profileIncomplete = !profile?.full_name || !profile?.email;
  if (profileIncomplete) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 px-4">
        <Info className="h-12 w-12 text-warning" />
        <p className="text-lg font-medium text-center">Please complete your profile before submitting a utilization request.</p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container max-w-2xl">
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
            Fill in the details below to request machine time.
          </p>
        </div>

        {/* Machine Selection / Info */}
        <section className="glass-panel rounded-xl p-5 mb-6">
          {!urlMachineId ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Select Machine *</h2>
                  <p className="text-xs text-muted-foreground">Choose the machine you want to use</p>
                </div>
              </div>
              <Select value={selectedCatalog} onValueChange={handleCatalogChange}>
                <SelectTrigger aria-label="Select machine">
                  <SelectValue placeholder="Pick a machine" />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  {MACHINE_CATALOG.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Other (custom name)</SelectItem>
                </SelectContent>
              </Select>
              {selectedCatalog === '__other__' && (
                <Input
                  value={customMachineName}
                  onChange={(e) => setCustomMachineName(e.target.value)}
                  onBlur={handleCustomNameBlur}
                  placeholder="Enter custom machine name"
                  className="mt-2"
                />
              )}
              {resolving && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Looking up machine...
                </div>
              )}
              {machineNotFound && !resolving && (
                <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  This machine hasn't been added by a faculty member yet. Ask your supervisor to add it first.
                </div>
              )}
              {machine && !resolving && (
                <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{machine.name}</span>
                    <Badge variant="outline" className="text-xs">{machine.status}</Badge>
                  </div>
                  {machine.description && (
                    <p className="text-xs text-muted-foreground mt-1">{machine.description}</p>
                  )}
                  {!machine.supervisor_id && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      No faculty assigned to this machine. Your request may take longer to be reviewed.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{machine!.name}</h2>
                  {machine!.shop_type && (
                    <p className="text-xs text-muted-foreground">{machine!.shop_type}</p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto text-xs">
                  {machine!.status}
                </Badge>
              </div>
              {machine!.description && (
                <p className="text-sm text-muted-foreground">{machine!.description}</p>
              )}
            </>
          )}
        </section>

        {/* Student Information */}
        <section className="glass-panel rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Student Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadOnlyField label="Name" value={profile!.full_name} />
            <ReadOnlyField label="Email" value={profile!.email} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <Label htmlFor="roll_number">Roll Number *</Label>
              <Input id="roll_number" {...register('roll_number')} className="mt-1.5" placeholder="e.g. 22CO101" />
              {errors.roll_number && <p className="text-xs text-destructive mt-1">{errors.roll_number.message}</p>}
            </div>
            <div>
              <Label htmlFor="branch">Branch *</Label>
              <Controller
                name="branch"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger id="branch" className="mt-1.5" aria-label="Branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {(Object.keys(BRANCH_LABELS) as StudentBranch[]).map((key) => (
                        <SelectItem key={key} value={key}>{BRANCH_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branch && <p className="text-xs text-destructive mt-1">{errors.branch.message}</p>}
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() ?? ''}>
                    <SelectTrigger id="year" className="mt-1.5" aria-label="Year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {[1, 2, 3, 4].map((y) => (
                        <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.year && <p className="text-xs text-destructive mt-1">{errors.year.message}</p>}
            </div>
            <div>
              <Label htmlFor="division">Division *</Label>
              <Input id="division" {...register('division')} className="mt-1.5" placeholder="e.g. A" />
              {errors.division && <p className="text-xs text-destructive mt-1">{errors.division.message}</p>}
            </div>
            <div>
              <Label htmlFor="batch">Batch *</Label>
              <Input id="batch" {...register('batch')} className="mt-1.5" placeholder="e.g. B1" />
              {errors.batch && <p className="text-xs text-destructive mt-1">{errors.batch.message}</p>}
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Work Details */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Work Details</h3>

            <div className="space-y-4">
              {/* Work Type */}
              <div>
                <Label htmlFor="work_type">Work Type *</Label>
                <Controller
                  name="work_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger id="work_type" className="mt-1.5" aria-label="Work type">
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {WORK_TYPE_LABELS[key]}
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

              {/* First Year Practical redirect notice */}
              {workType === 'first_year_practical' && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-400 font-medium mb-1">First Year Practical</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    First year practical sessions are managed by faculty through the Practical Module.
                    Contact your faculty to create a session, then mark attendance there.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              )}

              {/* Team Name (for team_project / final_year_project) */}
              {(workType === 'team_project' || workType === 'final_year_project') && (
                <>
                  <div>
                    <Label htmlFor="team_name">Team Name *</Label>
                    <Controller
                      name="team_name"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger id="team_name" className="mt-1.5" aria-label="Team name">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            {(Object.keys(TEAM_LABELS) as TeamName[]).map((key) => (
                              <SelectItem key={key} value={key}>{TEAM_LABELS[key]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.team_name && <p className="text-xs text-destructive mt-1">{errors.team_name.message}</p>}
                  </div>
                  {watch('team_name') === 'other' && (
                    <div>
                      <Label htmlFor="team_name_other">Other Team Name</Label>
                      <Input id="team_name_other" {...register('team_name_other')} className="mt-1.5" placeholder="Enter team name" />
                    </div>
                  )}
                </>
              )}

              {/* Permission Letter (for final_year_project) */}
              {workType === 'final_year_project' && (
                <div>
                  <Label htmlFor="permission_letter_url">Permission Letter URL</Label>
                  <Input
                    id="permission_letter_url"
                    {...register('permission_letter_url')}
                    className="mt-1.5"
                    placeholder="Paste a link to the uploaded permission letter"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Upload to Google Drive or similar and paste the share link</p>
                </div>
              )}

              {/* Work Description (shown for "other", "academic_event", or optionally) */}
              {(workType === 'other' || workType === 'academic_event') && (
                <div>
                  <Label htmlFor="work_description">Work Description *</Label>
                  <Textarea
                    id="work_description"
                    {...register('work_description')}
                    placeholder="Describe the work you'll be performing..."
                    className="mt-1.5"
                    rows={3}
                  />
                  {errors.work_description && (
                    <p className="text-xs text-destructive mt-1">{errors.work_description.message}</p>
                  )}
                </div>
              )}

              {/* Raw Material Source */}
              <div>
                <Label htmlFor="raw_material_source">Raw Material Source *</Label>
                <Controller
                  name="raw_material_source"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger id="raw_material_source" className="mt-1.5" aria-label="Raw material source">
                        <SelectValue placeholder="Select material source" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {(Object.keys(RAW_MATERIAL_LABELS) as RawMaterialSource[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {RAW_MATERIAL_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.raw_material_source && (
                  <p className="text-xs text-destructive mt-1">{errors.raw_material_source.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Estimated Usage</h3>

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
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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

              {/* Time */}
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

          {/* Safety Section */}
          <section className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Safety Compliance
            </h3>

            {recentSafety ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Safety Previously Acknowledged</p>
                  <p className="text-xs text-muted-foreground">
                    You acknowledged safety within the last 30 days.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* SOP container — user must scroll through */}
                {machine?.sop_pdf_url ? (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Please review the Standard Operating Procedure below. Scroll to the bottom to enable the safety checkbox.
                    </p>
                    <div
                      ref={sopContainerRef}
                      onScroll={handleSopScroll}
                      className="h-52 overflow-y-auto rounded-lg border border-white/10 bg-muted/20 p-1"
                    >
                      <iframe
                        src={machine!.sop_pdf_url!}
                        title="SOP Document"
                        className="w-full h-[600px] rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Review the safety checklist below before proceeding.
                    </p>
                    <div
                      ref={sopContainerRef}
                      onScroll={handleSopScroll}
                      className="h-52 overflow-y-auto rounded-lg border border-white/10 bg-muted/20 p-4 space-y-3"
                    >
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Safety Checklist
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">1.</span>
                          Wear appropriate PPE (safety goggles, gloves, ear protection) at all times.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">2.</span>
                          Ensure the machine is properly set up and all guards are in place.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">3.</span>
                          Never operate the machine without supervisor approval.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">4.</span>
                          Keep the work area clean and free from obstructions.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">5.</span>
                          Know the location of emergency stop buttons and fire extinguishers.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">6.</span>
                          Report any machine malfunction immediately to your supervisor.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">7.</span>
                          Do not use the machine if you are feeling unwell, fatigued, or under medication.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">8.</span>
                          Follow the Standard Operating Procedure (SOP) for this specific machine.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">9.</span>
                          Secure all loose clothing, hair, and jewelry before operating rotating equipment.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5">10.</span>
                          After use, power down the machine and clean the work area thoroughly.
                        </li>
                      </ul>
                      <Separator className="bg-white/10" />
                      <p className="text-xs text-muted-foreground italic">
                        End of safety checklist. You may now acknowledge below.
                      </p>
                    </div>
                    {!sopScrolled && (
                      <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Scroll to the bottom to enable the safety checkbox.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <Controller
              name="safety_acknowledged"
              control={control}
              render={({ field }) => (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-white/5">
                  <Checkbox
                    id="safety_acknowledged"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                    disabled={!safetyCheckboxEnabled}
                    aria-label="I have read and understood safety rules"
                  />
                  <label
                    htmlFor="safety_acknowledged"
                    className={cn(
                      'text-xs leading-relaxed cursor-pointer',
                      !safetyCheckboxEnabled && 'opacity-50',
                    )}
                  >
                    I have read and understood the safety rules, SOP, and guidelines for this machine.
                    I agree to follow all safety procedures during operation.
                  </label>
                </div>
              )}
            />
            {errors.safety_acknowledged && (
              <p className="text-xs text-destructive mt-1">{errors.safety_acknowledged.message}</p>
            )}
          </section>

          {/* Sticky submit bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 glass-panel-strong border-t border-white/10 p-4 md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="container max-w-2xl flex items-center justify-between gap-4">
              <div className="hidden md:block text-xs text-muted-foreground">
                {duration && machine
                  ? `${formatDuration(duration)} on ${machine.name}`
                  : 'Complete all fields to submit'}
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto"
                disabled={submitMutation.isPending || !activeMachineId}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
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

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-white/5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
