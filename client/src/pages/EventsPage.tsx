import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Calendar, MapPin, Loader2 } from "lucide-react";
import { useLanguage } from "../hooks/use-language";

export default function EventsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useLanguage();

  const EVENT_TYPES = [
    "meetup",
    "workshop",
    "conference",
    "mining_workshop",
    "trading_seminar",
    "developer_meetup"
  ] as const;

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: () => fetch("/api/events").then(res => res.json())
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: new Date(),
      organizerId: user?.id,
      type: "meetup",
      capacity: 20,
      isOnline: false
    }
  });

  const createEvent = useMutation({
    mutationFn: (data: InsertEvent) =>
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to create event"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div 
        className="h-[400px] relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1620321023374-d1a68fbc720d")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl font-bold text-white mb-4">{t('events.title')}</h1>
          <p className="text-xl text-white/90 max-w-2xl">{t('events.subtitle')}</p>
          <div className="mt-8 flex gap-4">
            <Button size="lg" variant="default" asChild>
              <a href="#upcoming">{t('events.view_events')}</a>
            </Button>
            {user && (
              <Button size="lg" variant="outline" onClick={() => document.querySelector('dialog')?.showModal()}>
                {t('events.create_event')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('events.upcoming')}</h2>
        
        {user ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t('events.create_event')}</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => createEvent.mutate(data))} className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isOnline"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isOnline"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <label htmlFor="isOnline">Online Event</label>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createEvent.isPending}>
                  {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        ) : (
          <Link href="/login">
            <Button>{t('events.login_to_create')}</Button>
          </Link>
        )}
      </div>

      <div id="upcoming" className="grid md:grid-cols-2 gap-6">
        {events?.map(event => (
          <Card key={event.id} className="overflow-hidden">
            <div className="h-48 bg-muted" />
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="mb-2">{event.title}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>{format(new Date(event.date), "PPP")}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={event.isOnline ? "outline" : "default"}>
                  {event.isOnline ? "Online" : "In Person"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3">{event.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <Badge variant="secondary">
                  {event.type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {event.capacity} spots available
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
