import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";
import { EditBusinessForm } from "@/components/EditBusinessForm";
import type { Post, User, Resource, Business, Event } from "@db/schema";

interface PostWithAuthor extends Post {
  author: User;
}

interface AdminStats {
  posts: PostWithAuthor[];
  businesses: Business[];
  resources: Resource[];
  events: Event[];
  totalUsers: number;
}

export default function AdminPanel() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch admin stats");
      }
      return response.json();
    },
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
        </div>

        <Tabs defaultValue="businesses" className="w-full">
          <TabsList>
            <TabsTrigger value="businesses">Negocios</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

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
                              onSubmit={async (data) => {
                                if (isPending) return;
                                
                                try {
                                  startTransition(() => {
                                    (async () => {
                                      const response = await fetch(`/api/businesses/${business.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(data),
                                        credentials: 'include'
                                      });

                                      if (!response.ok) {
                                        throw new Error('Failed to update business');
                                      }

                                      // Close dialog
                                      const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                      if (closeButton) {
                                        closeButton.click();
                                      }

                                      // Refresh the data
                                      await Promise.all([
                                        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
                                        queryClient.invalidateQueries({ queryKey: ['businesses'] })
                                      ]);

                                      toast({
                                        title: "Negocio actualizado exitosamente",
                                        variant: "default"
                                      });
                                    })();
                                  });
                                } catch (error) {
                                  console.error('Error updating business:', error);
                                  toast({
                                    title: "Error al actualizar el negocio",
                                    description: error instanceof Error ? error.message : "Unknown error occurred",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              isPending={isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/businesses/${business.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });

                              if (!response.ok) {
                                throw new Error('Failed to delete business');
                              }

                              // Invalidate both admin stats and businesses queries
                              await Promise.all([
                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
                                queryClient.invalidateQueries({ queryKey: ['businesses'] })
                              ]);
                              toast({
                                title: "Negocio eliminado exitosamente",
                                variant: "default"
                              });
                            } catch (error) {
                              console.error('Error deleting business:', error);
                              toast({
                                title: "Failed to delete business",
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
          {/* Rest of the TabsContent for posts, resources, and events */}
          <TabsContent value="posts">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Gestión de Publicaciones</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Administra las publicaciones del foro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.posts?.map((post: PostWithAuthor) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{post.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Por: {post.author?.username} | {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              // TODO: Implement edit functionality
                              console.log('Edit post:', post.id);
                            }}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async () => {
                              // Store previous states for rollback
                              let previousStats: AdminStats | undefined;
                              let previousPosts: Post[] | undefined;
                              
                              try {
                                // Get current data states
                                previousStats = queryClient.getQueryData<AdminStats>(['admin-stats']);
                                previousPosts = queryClient.getQueryData<Post[]>(['posts']);

                                // Only proceed with optimistic updates if we have valid data
                                if (previousStats && 'posts' in previousStats) {
                                  const updatedStats: AdminStats = {
                                    ...previousStats,
                                    posts: previousStats.posts.filter((p) => p.id !== post.id),
                                    totalPosts: Math.max(0, previousStats.totalPosts - 1)
                                  };
                                  startTransition(() => {
                                  queryClient.setQueryData(['admin-stats'], updatedStats);
                                });
                                }

                                if (previousPosts && Array.isArray(previousPosts)) {
                                  const updatedPosts = previousPosts.filter((p) => p.id !== post.id);
                                  startTransition(() => {
                                  queryClient.setQueryData(['posts'], updatedPosts);
                                });
                                }

                                const response = await fetch(`/api/posts/${post.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include'
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to delete post');
                                }

                                // Show success toast
                                toast({
                                  title: t('admin.posts.delete_success'),
                                  description: post.title,
                                  variant: "default"
                                });

                                // Invalidate queries to ensure consistency
                                await Promise.all([
                                  queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
                                  queryClient.invalidateQueries({ queryKey: ['posts'] })
                                ]);
                              } catch (error) {
                                console.error('Error deleting post:', error);
                                
                                // Restore previous states on error
                                if (previousStats) {
                                  queryClient.setQueryData(['admin-stats'], previousStats);
                                }
                                if (previousPosts) {
                                  queryClient.setQueryData(['posts'], previousPosts);
                                }
                                
                                toast({
                                  title: t('admin.posts.delete_error'),
                                  description: `Failed to delete post: ${post.title}`,
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{post.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="resources">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Recursos Pendientes</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Aprueba o rechaza recursos enviados por usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.resources?.map((resource: ResourceWithAuthor) => (
                    <div key={resource.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Por: {resource.author?.username} | Tipo: {resource.type} | {new Date(resource.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm mt-2">{resource.description}</p>
                          <div className="flex gap-2 mt-1">
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-primary hover:underline inline-block"
                            >
                              Ver recurso
                            </a>
                            <Link 
                              href="/resources"
                              className="text-sm text-primary hover:underline inline-block"
                            >
                              Ver en página de recursos
                            </Link>
                          </div>
                        </div>
                        <div className="space-x-2">
                          {!resource.approved && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/resources/${resource.id}/approve`, {
                                    method: 'POST',
                                    credentials: 'include'
                                  });
                                  if (!response.ok) throw new Error('Failed to approve resource');
                                  queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                } catch (error) {
                                  console.error('Error approving resource:', error);
                                }
                              }}
                            >
                              Aprobar
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/resources/${resource.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include'
                                });
                                if (!response.ok) throw new Error('Failed to delete resource');
                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                toast({
                                  title: "Resource deleted successfully",
                                  variant: "default"
                                });
                              } catch (error) {
                                console.error('Error deleting resource:', error);
                                toast({
                                  title: "Failed to delete resource",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
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
          <TabsContent value="events">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Gestión de Eventos</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Administra los eventos de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.events?.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Fecha: {new Date(event.date).toLocaleDateString()} | Ubicación: {event.location}
                          </p>
                          <p className="text-sm mt-2">{event.description}</p>
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
                                <DialogTitle>Editar Evento</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const dateStr = formData.get('date') as string;
                                
                                // Validate date
                                if (!dateStr) {
                                  toast({
                                    title: "Error",
                                    description: "La fecha es requerida",
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                try {
                                  // Ensure date is valid
                                  const date = new Date(dateStr);
                                  if (isNaN(date.getTime())) {
                                    throw new Error('Fecha inválida');
                                  }

                                  const updatedEvent = {
                                    title: formData.get('title'),
                                    description: formData.get('description'),
                                    location: formData.get('location'),
                                    date: date.toISOString(), // Convert to ISO string for backend
                                  };

                                  const response = await fetch(`/api/events/${event.id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(updatedEvent),
                                    credentials: 'include'
                                  });

                                  if (!response.ok) {
                                    const error = await response.text();
                                    throw new Error(error || 'Failed to update event');
                                  }

                                  // Show success toast
                                  toast({
                                    title: "Evento actualizado exitosamente",
                                    description: `${updatedEvent.title}`,
                                    variant: "default"
                                  });

                                  // Close the dialog
                                  const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                                  if (closeButton) {
                                    closeButton.click();
                                  }

                                  // Invalidate queries to refresh the data
                                  await Promise.all([
                                    queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
                                    queryClient.invalidateQueries({ queryKey: ['events'] })
                                  ]);
                                } catch (error) {
                                  console.error('Error updating event:', error);
                                  toast({
                                    title: "Failed to update event",
                                    description: error instanceof Error ? error.message : "Unknown error occurred",
                                    variant: "destructive"
                                  });
                                }
                              }} className="space-y-4 mt-4">
                                <div>
                                  <Label htmlFor="title">Título</Label>
                                  <Input 
                                    id="title" 
                                    name="title" 
                                    defaultValue={event.title}
                                    required 
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="description">Descripción</Label>
                                  <Textarea 
                                    id="description" 
                                    name="description" 
                                    defaultValue={event.description}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="location">Ubicación</Label>
                                  <Input 
                                    id="location" 
                                    name="location" 
                                    defaultValue={event.location}
                                    required 
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="date">Fecha</Label>
                                  <Input 
                                    type="datetime-local"
                                    id="date" 
                                    name="date" 
                                    defaultValue={new Date(event.date).toISOString().slice(0, 16)}
                                    required 
                                  />
                                </div>
                                <Button type="submit">Guardar Cambios</Button>
                              </form>
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

                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                queryClient.invalidateQueries({ queryKey: ['events'] });
                              } catch (error) {
                                console.error('Error deleting event:', error);
                              }
                            }}
                          >
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