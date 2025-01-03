import React, { useState, useTransition } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useUser } from "@/hooks/use-user";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

// Icons
import { Loader2, Plus, FolderOpen, Link2, Pencil } from "lucide-react";

// Form Components
import { EditBusinessForm } from "@/components/EditBusinessForm";
import { EditPostForm } from "@/components/EditPostForm";
import { EditResourceForm } from "@/components/EditResourceForm";
import { EditEventForm } from "@/components/EditEventForm";
import { EditUserForm } from "@/components/EditUserForm";

// Types
import type { Post, User, Resource, Business, Event } from "@/db/schema";
import * as z from "zod";

// Event form schema for validation
const eventFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  location: z.string().min(1, "La ubicación es requerida"),
  date: z.string().min(1, "La fecha es requerida")
});

type EventFormData = z.infer<typeof eventFormSchema>;

type CarouselFormData = {
  title: string;
  description: string;
  embed_url: string;
  active: boolean;
};

interface CarouselItem {
  id: number;
  title: string;
  description: string | null;
  embed_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
}

interface AdminStats {
  posts: PostWithAuthor[];
  businesses: BusinessData[];
  resources: ResourceWithAuthor[];
  events: Event[];
  users: User[];
  carousel: CarouselItem[];
  totalUsers: number;
  totalPosts: number;
}

type BusinessData = Business;

interface PostWithAuthor extends Omit<Post, 'authorId'> {
  author: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    createdAt: string;
  };
}

interface ResourceWithAuthor extends Resource {
  author: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    createdAt: string;
  };
}


const getEmbedUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Handle YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Handle Twitter/X URLs
    if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      return `https://platform.twitter.com/embed/Tweet.html?url=${encodeURIComponent(url)}`;
    }
    // Return original URL for direct embeds
    return url;
  } catch (e) {
    console.error('Invalid URL:', e);
    return url;
  }
};

export default function AdminPanel() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();

  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);

  const carouselForm = useForm<CarouselFormData>({
    defaultValues: {
      title: "",
      description: "",
      embed_url: "",
      active: true,
    }
  });

  const eventForm = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      date: new Date().toISOString().slice(0, 16)
    }
  });

  // Reset form when editing item changes
  React.useEffect(() => {
    if (editingItem) {
      carouselForm.reset({
        title: editingItem.title,
        description: editingItem.description || "",
        embed_url: editingItem.embed_url,
        active: editingItem.active,
      });
    } else {
      carouselForm.reset({
        title: "",
        description: "",
        embed_url: "",
        active: true,
      });
    }
  }, [editingItem]);

  const { data: stats, isLoading, error, refetch } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) {
          throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const handleEventUpdate = async (formData: EventFormData, eventId: number): Promise<void> => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date).toISOString()
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: "Event updated successfully" });

      // Close dialog
      const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
      if (closeButton) closeButton.click();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error updating event",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
        </div>

        <Tabs defaultValue="carousel" className="w-full">
          <TabsList>
            <TabsTrigger value="carousel">Carousel</TabsTrigger>
            <TabsTrigger value="businesses">Negocios</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          {/* Carousel Tab */}
          <TabsContent value="carousel">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle>Gestión del Carousel</CardTitle>
                  <CardDescription>Administra el contenido del carousel en la página principal</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Nuevo Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Agregar Item al Carousel</DialogTitle>
                      <DialogDescription>Añade un nuevo elemento al carrusel de la página principal.</DialogDescription>
                    </DialogHeader>
                    <Form {...carouselForm}>
                      <form onSubmit={carouselForm.handleSubmit(async (data) => {
                        try {
                          // Basic validation
                          if (!data.title.trim()) {
                            throw new Error('El título es requerido');
                          }
                          if (!data.embed_url.trim()) {
                            throw new Error('La URL es requerida');
                          }

                          startTransition(() => {
                            // Handle the async operations inside the transition
                            const submitCarouselItem = async () => {
                              try {
                                const response = await fetch('/api/carousel', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    title: data.title.trim(),
                                    description: data.description?.trim() || null,
                                    embed_url: data.embed_url.trim(),
                                    active: data.active
                                  }),
                                  credentials: 'include'
                                });

                                const result = await response.json();

                                if (!response.ok) {
                                  throw new Error(result.message || 'Error al agregar el item al carousel');
                                }

                                await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                toast({ title: "Item agregado exitosamente" });

                                // Reset form
                                carouselForm.reset();

                                // Close dialog
                                const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                if (closeButton) closeButton.click();
                              } catch (error) {
                                console.error('Error adding carousel item:', error);
                                toast({
                                  title: "Error al agregar item",
                                  description: error instanceof Error ? error.message : "Ha ocurrido un error desconocido",
                                  variant: "destructive"
                                });
                              }
                            };

                            void submitCarouselItem();
                          });
                        } catch (validationError) {
                          toast({
                            title: "Error de validación",
                            description: validationError instanceof Error ? validationError.message : "Error en el formulario",
                            variant: "destructive"
                          });
                        }
                      })} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={carouselForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="text"
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="Título del elemento"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={carouselForm.control}
                            name="embed_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL del Embed</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="text"
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="https://..."
                                  />
                                </FormControl>
                                <FormDescription>
                                  Soporta URLs de YouTube, Twitter/X y enlaces directos
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={carouselForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="Descripción del elemento..."
                                  className="min-h-[100px]"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={carouselForm.control}
                          name="active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-normal">
                                  Mostrar en el carousel
                                </FormLabel>
                                <FormDescription>
                                  Este elemento será visible en la página principal si está activo
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="submit" disabled={isPending}>
                            {isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>Agregar Item</>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                <div className="mt-6 space-y-6">
                  {!stats?.carousel ? (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2">No hay elementos disponibles</p>
                    </div>
                  ) : stats.carousel.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2">No se encontraron elementos</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {stats.carousel.map((item) => (
                        <Card key={item.id} className={cn(
                          "transition-all duration-200",
                          !item.active && "opacity-60"
                        )}>
                          <CardHeader className="relative pb-0">
                            <div className="absolute -right-1 -top-1">
                              <Badge variant={item.active ? "default" : "secondary"} className="rounded-lg">
                                {item.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1.5 line-clamp-2">
                                {item.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden mb-4">
                              <iframe
                                src={getEmbedUrl(item.embed_url)}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                <span className="truncate">{item.embed_url}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Actualizado: {new Date(item.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-end gap-2">
                            <Dialog onOpenChange={(open) => {
                              if (open) {
                                setEditingItem(item);
                              } else {
                                setEditingItem(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle>Editar Item del Carousel</DialogTitle>
                                  <DialogDescription>
                                    Modifica los detalles del elemento seleccionado.
                                  </DialogDescription>
                                </DialogHeader>
                                <Form {...carouselForm}>
                                  <form onSubmit={carouselForm.handleSubmit(async (data) => {
                                    try {
                                      const response = await fetch(`/api/carousel/${item.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(data),
                                        credentials: 'include'
                                      });

                                      if (!response.ok) throw new Error('Failed to update carousel item');

                                      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                      toast({ title: "Item actualizado exitosamente" });

                                      const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                      if (closeButton) closeButton.click();
                                    } catch (error) {
                                      console.error('Error updating carousel item:', error);
                                      toast({
                                        title: "Error al actualizar item",
                                        description: error instanceof Error ? error.message : "Unknown error occurred",
                                        variant: "destructive"
                                      });
                                    }
                                  })} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={carouselForm.control}
                                        name="title"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Título</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={carouselForm.control}
                                        name="embed_url"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>URL del Embed</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <FormField
                                      control={carouselForm.control}
                                      name="description"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Descripción</FormLabel>
                                          <FormControl>
                                            <Textarea {...field} className="min-h-[100px]" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={carouselForm.control}
                                      name="active"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                            />
                                          </FormControl>
                                          <div className="space-y-1 leading-none">
                                            <FormLabel className="font-normal">
                                              Mostrar en el carousel
                                            </FormLabel>
                                            <FormDescription>
                                              Este elemento será visible en la página principal si está activo
                                            </FormDescription>
                                          </div>
                                        </FormItem>
                                      )}
                                    />
                                    <div className="flex justify-end space-x-2">
                                      <Button type="submit" disabled={isPending}>
                                        {isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                          </>
                                        ) : (
                                          <>Guardar Cambios</>
                                        )}
                                      </Button>
                                    </div>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/carousel/${item.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include'
                                  });

                                  if (!response.ok) throw new Error('Failed to delete carousel item');

                                  await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                  toast({ title: "Item eliminado exitosamente" });
                                } catch (error) {
                                  console.error('Error deleting carousel item:', error);
                                  toast({
                                    title: "Error al eliminar item",
                                    description: error instanceof Error ? error.message : "Unknown error occurred",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Eliminar
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>Negocios Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stats?.businesses.map((business) => (
                    <div
                      key={business.id}
                      className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold">{business.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {business.description}
                        </p>
                        <p className="text-sm">
                          {business.address}, {business.city}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Negocio</DialogTitle>
                            </DialogHeader>
                            <EditBusinessForm
                              business={business}
                              onSubmit={async (formData) => {
                                if (isPending) return;

                                startTransition(() => {
                                  // Optimistically update the UI
                                  queryClient.setQueryData(['admin-stats'], (oldData: AdminStats | undefined) => {
                                    if (!oldData) return oldData;
                                    return {
                                      ...oldData,
                                      businesses: oldData.businesses.map(b =>
                                        b.id === business.id ? { ...b, ...formData } : b
                                      )
                                    };
                                  });
                                });

                                try {
                                  const response = await fetch(`/api/businesses/${business.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Accept': 'application/json'
                                    },
                                    body: JSON.stringify(formData),
                                    credentials: 'include'
                                  });

                                  const responseData = await response.json();

                                  if (!response.ok) {
                                    throw new Error(responseData.message || 'Failed to update business');
                                  }

                                  const updatedBusiness = responseData;

                                  startTransition(() => {
                                    // Update cache with the server response
                                    queryClient.setQueryData(['admin-stats'], (oldData: AdminStats | undefined) => {
                                      if (!oldData) return oldData;
                                      return {
                                        ...oldData,
                                        businesses: oldData.businesses.map(b =>
                                          b.id === business.id ? updatedBusiness : b
                                        )
                                      };
                                    });
                                  });

                                  // Force a refetch to ensure consistency
                                  await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                  await queryClient.invalidateQueries({ queryKey: ['businesses'] });

                                  toast({ title: "Negocio actualizado exitosamente" });

                                  // Close dialog
                                  const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                  if (closeButton) closeButton.click();
                                } catch (error) {
                                  console.error('Error updating business:', error);
                                  // Revert optimistic update on error
                                  await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                  toast({
                                    title: "Error al actualizar negocio",
                                    description: error instanceof Error ? error.message : "Unknown error occurred",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              isPending={isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm">
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Posts</CardTitle>
                <CardDescription>Administra los posts del foro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.posts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{post.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Por {post.author.username}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Post</DialogTitle>
                              </DialogHeader>
                              <EditPostForm
                                post={post}
                                onSubmit={async (data) => {
                                  try {
                                    const response = await fetch(`/api/posts/${post.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(data)
                                    });

                                    if (!response.ok) throw new Error('Failed to update post');

                                    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                    toast({ title: "Post actualizado exitosamente" });

                                    const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                    if (closeButton) closeButton.click();
                                  } catch (error) {
                                    console.error('Error updating post:', error);
                                    toast({
                                      title: "Error al actualizar post",
                                      description: error instanceof Error ? error.message : "Unknown error occurred",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                isPending={isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="destructive" size="sm">
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Recursos</CardTitle>
                <CardDescription>Administra los recursos educativos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.resources.map((resource) => (
                    <div key={resource.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Por {resource.author.username}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Recurso</DialogTitle>
                              </DialogHeader>
                              <EditResourceForm
                                resource={resource}
                                onSubmit={async (data) => {
                                  try {
                                    const response = await fetch(`/api/resources/${resource.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(data)
                                    });

                                    if (!response.ok) throw new Error('Failed to update resource');

                                    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                    toast({ title: "Recurso actualizado exitosamente" });

                                    const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                    if (closeButton) closeButton.click();
                                  } catch (error) {
                                    console.error('Error updating resource:', error);
                                    toast({
                                      title: "Error al actualizar recurso",
                                      description: error instanceof Error ? error.message : "Unknown error occurred",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                isPending={isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="destructive" size="sm">
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle>Eventos</CardTitle>
                  <CardDescription>Gestiona los eventos de la comunidad</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Evento</DialogTitle>
                    </DialogHeader>
                    <Form {...eventForm}>
                      <form onSubmit={eventForm.handleSubmit(async (data) => {
                        try {
                          const response = await fetch('/api/events', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                              ...data,
                              date: new Date(data.date).toISOString()
                            })
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Error al crear el evento');
                          }

                          await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                          toast({ title: "Evento creado exitosamente" });

                          // Close dialog
                          const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                          if (closeButton) closeButton.click();

                        } catch (error) {
                          console.error('Error creating event:', error);
                          toast({
                            title: "Error al crear el evento",
                            description: error instanceof Error ? error.message : "Ha ocurrido un error desconocido",
                            variant: "destructive"
                          });
                        }
                      })} className="space-y-4">
                        <FormField
                          control={eventForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eventForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eventForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ubicación</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eventForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha y Hora</FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="submit" disabled={isPending}>
                            {isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>Crear Evento</>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.date).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Evento</DialogTitle>
                            </DialogHeader>
                            <EditEventForm
                              event={event}
                              isPending={isPending}
                              onSubmit={async (formData) => {
                                if (typeof event.id === 'number') {
                                  await handleEventUpdate(formData, event.id);
                                }
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/events/${event.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });

                              if (!response.ok) {
                                throw new Error('Failed to delete event');
                              }

                              await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                              toast({ title: "Evento eliminado exitosamente" });
                            } catch (error) {
                              console.error('Error deleting event:', error);
                              toast({
                                title: "Error al eliminar evento",
                                description: error instanceof Error ? error.message : "Ha ocurrido un error desconocido",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {user.email} - {user.role}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Usuario</DialogTitle>
                              </DialogHeader>
                              <EditUserForm
                                user={user}
                                onSubmit={async (data) => {
                                  try {
                                    const response = await fetch(`/api/users/${user.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(data)
                                    });

                                    if (!response.ok) throw new Error('Failed to update user');

                                    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                    toast({ title: "Usuario actualizado exitosamente" });

                                    const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                    if (closeButton) closeButton.click();
                                  } catch (error) {
                                    console.error('Error updating user:', error);
                                    toast({
                                      title: "Error al actualizar usuario",
                                      description: error instanceof Error ? error.message : "Unknown error occurred",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                isPending={isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="destructive" size="sm">
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}