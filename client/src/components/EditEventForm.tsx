import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Event } from "@/db/schema";

interface EditEventFormProps {
  event: Event;
  onSubmit: (data: Partial<Event>) => Promise<void>;
  isPending: boolean;
}

export function EditEventForm({ event, onSubmit, isPending }: EditEventFormProps) {
  const form = useForm({
    defaultValues: {
      title: event.title,
      description: event.description,
      location: event.location,
      date: new Date(event.date).toISOString().slice(0, 16)
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => {
        const formattedData = {
          ...data,
          date: new Date(data.date).toISOString()
        };
        onSubmit(formattedData);
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
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Event
        </Button>
      </form>
    </Form>
  );
}
