import React, { useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUser } from "../hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { insertEventSchema, type InsertEvent, type Event } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar, MapPin, Loader2, Heart, Instagram, X } from "lucide-react";
import { useLanguage } from "../hooks/use-language";

export default function EventsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: events = [], isLoading, isFetching } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    staleTime: 5000,
    refetchOnWindowFocus: false,
    retry: 3
  });

  // Function to get the next 21st date
  const getNext21stDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const next21st = new Date(currentYear, currentMonth, 21);
    
    // If we're past the 21st of this month, get next month's 21st
    if (now.getDate() > 21) {
      next21st.setMonth(currentMonth + 1);
    }
    
    return next21st;
  };

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: getNext21stDate(),
      organizerId: user?.id
    }
  });

  const createEvent = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        form.reset();
        toast({ 
          title: "Event created successfully",
          variant: "default"
        });
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center min-h-[400px] items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div 
        className="h-[400px] relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1531482615713-2afd69097998")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background/90 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl font-bold text-white mb-4">{t('events.title')}</h1>
          <p className="text-xl text-white/90 max-w-2xl">{t('events.subtitle')}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('events.upcoming')}</h2>
        
        {user?.role === 'admin' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t('events.create_event')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => {
                  startTransition(() => {
                    createEvent.mutate(data);
                    queryClient.invalidateQueries({ queryKey: ['events'] });
                  });
                })} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            value={field.value.toISOString().slice(0, 16)}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createEvent.isPending || isPending}>
                    {(createEvent.isPending || isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Event
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <ErrorBoundary>
        <div className={`grid md:grid-cols-2 gap-6 ${isPending || isFetching ? 'opacity-50 pointer-events-none' : ''}`}>
          {events.map((event: Event) => (
            <Card key={event.id} className="group hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-2xl group-hover:text-primary transition-colors duration-200">
                  {event.title}
                </CardTitle>
                <div className="flex flex-col space-y-2 mt-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-5 w-5 text-primary" />
                    <span className="font-medium">{format(new Date(event.date), "PPP 'at' p")}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-5 w-5 text-primary" />
                    <span className="font-medium">{event.location}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="hover:text-primary"
                    onClick={(e) => {
                      if (isPending) return;
                      e.stopPropagation();
                      startTransition(() => {
                        (async () => {
                          try {
                            const response = await fetch(`/api/events/${event.id}/like`, { 
                              method: 'POST',
                              credentials: 'include'
                            });
                            if (!response.ok) {
                              throw new Error('Failed to like event');
                            }
                            await queryClient.invalidateQueries({ queryKey: ['events'] });
                          } catch (error) {
                            toast({
                              title: "Failed to like event",
                              description: error instanceof Error ? error.message : "An error occurred",
                              variant: "destructive"
                            });
                          }
                        })();
                      });
                    }}
                    disabled={isPending}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    <span>{event.likes}</span>
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-black dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPending) {
                          startTransition(() => {
                            const tweetText = `Check out ${event.title} at ${event.location} on ${format(
                              new Date(event.date),
                              "PPP"
                            )}!`;
                            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                              `${tweetText}&url=${window.location.href}`
                            )}`;
                            window.open(tweetUrl, "_blank");
                          });
                        }
                      }}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-[#E4405F]"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => {
                          window.open(
                            `https://www.instagram.com/share?url=${encodeURIComponent(window.location.href)}`,
                            "_blank"
                          );
                        });
                      }}
                      disabled={isPending}
                    >
                      <Instagram className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-4 w-full group-hover:bg-primary group-hover:text-white transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    const eventDate = new Date(event.date);
                    const endDate = new Date(eventDate);
                    endDate.setHours(eventDate.getHours() + 2);
                    
                    const icsData = [
                      'BEGIN:VCALENDAR',
                      'VERSION:2.0',
                      'BEGIN:VEVENT',
                      `DTSTART:${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                      `SUMMARY:${event.title}`,
                      `DESCRIPTION:${event.description}`,
                      `LOCATION:${event.location}`,
                      'END:VEVENT',
                      'END:VCALENDAR'
                    ].join('\n');
                    
                    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = `${event.title.toLowerCase().replace(/\s+/g, '-')}.ics`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ErrorBoundary>
    </div>
  );
}
