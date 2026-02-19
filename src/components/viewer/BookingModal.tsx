import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBooking } from '@/services/booking-service';
import { useWorkshopStore } from '@/stores/workshop-store';
import { useToast } from '@/hooks/use-toast';
import type { Machine } from '@/types/database';

const bookingSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  machine: Machine;
  workshopId: string;
  onClose: () => void;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export default function BookingModal({ machine, workshopId, onClose }: BookingModalProps) {
  const { toast } = useToast();
  const { currentWorkshop } = useWorkshopStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const selectedStartTime = watch('start_time');

  const onSubmit = async (form: BookingForm) => {
    setIsSubmitting(true);
    try {
      await createBooking({
        machine_id: machine.id,
        workshop_id: currentWorkshop?.id || workshopId,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        purpose: form.purpose,
      });

      toast({
        title: 'Booking submitted!',
        description: 'Your booking is pending approval from faculty.',
      });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Booking failed',
        description: err.message || 'Could not create booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-lg glass-panel-strong rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold">Book Machine</h2>
              <p className="text-sm text-muted-foreground">{machine.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Date
              </Label>
              <Input
                id="date"
                type="date"
                min={today}
                {...register('date')}
                className="bg-muted/30"
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Time slots */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Start Time
                </Label>
                <Select onValueChange={(v) => setValue('start_time', v)}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> End Time
                </Label>
                <Select onValueChange={(v) => setValue('end_time', v)}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    {TIME_SLOTS.filter((t) => !selectedStartTime || t > selectedStartTime).map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Purpose
              </Label>
              <Textarea
                id="purpose"
                placeholder="Describe what you'll be using the machine for..."
                rows={3}
                {...register('purpose')}
                className="bg-muted/30 resize-none"
              />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
            </div>

            {/* Max hours note */}
            <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg">
              Maximum booking duration: {machine.max_booking_hours} hours per session
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Booking'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[55]"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
