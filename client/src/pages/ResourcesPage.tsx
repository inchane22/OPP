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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { insertResourceSchema, type InsertResource, type Resource } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Book, Link as LinkIcon, Video, Loader2 } from "lucide-react";

const RESOURCE_TYPES = ["article", "video", "book", "tool"] as const;

export default function ResourcesPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: () => fetch("/api/resources").then(res => res.json())
  });

  const form = useForm<InsertResource>({
    resolver: zodResolver(insertResourceSchema),
    defaultValues: {
      title: "",
      description: "",
      url: "",
      type: "article",
      authorId: user?.id,
      approved: false
    }
  });

  const createResource = useMutation({
    mutationFn: (data: InsertResource) =>
      fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Resource submitted for review" });
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to submit resource"
      });
    }
  });

  function getResourceIcon(type: string) {
    switch (type) {
      case "article":
        return <Book className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  }

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
        className="h-[300px] relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1515378791036-0648a3ef77b2")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Bitcoin Educational Resources</h1>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Approved Resources</h2>
        
        {user ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Submit Resource</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit New Resource</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => createResource.mutate(data))} className="space-y-4">
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
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RESOURCE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createResource.isPending}>
                  {createResource.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Resource
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        ) : (
          <Link href="/login">
            <Button>Login to Submit Resource</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6">
        {resources?.filter(r => r.approved).map(resource => (
          <Card key={resource.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getResourceIcon(resource.type)}
                {resource.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{resource.description}</p>
              <Button variant="outline" asChild>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  Visit Resource
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
