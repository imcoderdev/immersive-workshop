import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, User, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { updateProfile } from '@/services/auth-service';
import type { StudentBranch } from '@/types/database';
import { BRANCH_LABELS } from '@/types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isProfileComplete(profile: {
  full_name?: string | null;
  phone?: string | null;
  roll_number?: string | null;
  branch?: string | null;
  year?: number | null;
  division?: string | null;
  batch?: string | null;
} | null): boolean {
  if (!profile) return false;
  if (!profile.full_name?.trim() || !profile.phone?.trim() || !profile.roll_number?.trim()) return false;
  if (!profile.branch || !profile.year) return false;
  if (profile.year === 1 && (!profile.division?.trim() || !profile.batch?.trim())) return false;
  return true;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z
  .object({
    full_name: z.string().min(2, 'Full name is required'),
    phone: z.string().min(10, 'Valid mobile number is required'),
    roll_number: z.string().min(1, 'Roll number is required'),
    branch: z.string().min(1, 'Branch is required'),
    year: z.coerce.number().min(1).max(4, 'Year must be 1-4'),
    division: z.string().optional(),
    batch: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.year === 1) return !!d.division?.trim();
      return true;
    },
    { message: 'Division is required for Year 1', path: ['division'] },
  )
  .refine(
    (d) => {
      if (d.year === 1) return !!d.batch?.trim();
      return true;
    },
    { message: 'Batch is required for Year 1', path: ['batch'] },
  );

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/dashboard';

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      roll_number: profile?.roll_number || '',
      branch: profile?.branch || '',
      year: profile?.year || undefined,
      division: profile?.division || '',
      batch: profile?.batch || '',
    },
  });

  const year = watch('year');

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user) throw new Error('Not authenticated');
      return updateProfile(user.id, {
        full_name: values.full_name,
        phone: values.phone,
        roll_number: values.roll_number,
        branch: values.branch as StudentBranch,
        year: values.year,
        division: values.year === 1 ? values.division || null : null,
        batch: values.year === 1 ? values.batch || null : null,
      });
    },
    onSuccess: async () => {
      await fetchProfile();
      setSaved(true);
      toast({ title: 'Profile saved!', description: 'Your profile has been updated successfully.' });
      setTimeout(() => navigate(returnTo), 800);
    },
    onError: (err: Error) => {
      const msg = err.message?.includes('duplicate')
        ? 'This roll number is already registered. Please check and try again.'
        : err.message;
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Student Profile</h1>
              <p className="text-sm text-muted-foreground">
                Complete your profile to access machine utilization forms.
              </p>
            </div>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6 fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Profile saved! Redirecting…</span>
          </div>
        )}

        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          {/* Identity */}
          <section className="glass-panel rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Identity</h3>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...register('full_name')} className="mt-1.5" placeholder="e.g. John Doe" />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <Label>Email</Label>
              <div className="mt-1.5 p-2.5 rounded-lg bg-muted/30 border border-white/5 text-sm font-medium">
                {user.email}
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Mobile Number *</Label>
              <Input id="phone" type="tel" {...register('phone')} className="mt-1.5" placeholder="e.g. 9876543210" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <Label htmlFor="roll_number">Roll Number *</Label>
              <Input id="roll_number" {...register('roll_number')} className="mt-1.5" placeholder="e.g. 22CO101" />
              {errors.roll_number && <p className="text-xs text-destructive mt-1">{errors.roll_number.message}</p>}
            </div>
          </section>

          {/* Academic */}
          <section className="glass-panel rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Academic Details</h3>

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
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value?.toString() ?? ''}
                  >
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

            {year === 1 && (
              <div className="grid grid-cols-2 gap-4">
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
            )}
          </section>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saveMutation.isPending || saved}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              'Save Profile'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
