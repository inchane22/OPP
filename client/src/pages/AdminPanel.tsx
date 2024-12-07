import * as React from "react";
import { useTransition } from "react";
import { Link } from "wouter";
import { useUser } from "../hooks/use-user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";
import type { Post, User, Resource, Business, Event } from "@db/schema";

interface PostWithAuthor extends Post {
  author: Pick<User, 'username'> | null;
}

interface ResourceWithAuthor extends Resource {
  author: Pick<User, 'username'> | null;
}

interface BusinessWithSubmitter extends Business {
  submitter: Pick<User, 'username'> | null;
}

interface EventWithOrganizer extends Event {
  organizer: Pick<User, 'username'> | null;
}

interface CarouselItem {
  id: number;
  title: string;
  embedUrl: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
}

interface AdminStats {
  totalUsers: number;
  totalResources: number;
  totalEvents: number;
  totalBusinesses: number;
  totalPosts: number;
  users: User[];
  posts: PostWithAuthor[];
  resources: ResourceWithAuthor[];
  businesses: BusinessWithSubmitter[];
  events: EventWithOrganizer[];
  carouselItems: CarouselItem[];
}

async function fetchStats(): Promise<AdminStats> {
  const response = await fetch('/api/admin/stats');
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch admin stats: ${error}`);
  }
  const data = await response.json();
  return {
    totalUsers: data.totalUsers ?? 0,
    totalResources: data.totalResources ?? 0,
    totalEvents: data.totalEvents ?? 0,
    totalBusinesses: data.totalBusinesses ?? 0,
    totalPosts: data.totalPosts ?? 0,
    users: data.users ?? [],
    posts: data.posts ?? [],
    resources: data.resources ?? [],
    businesses: data.businesses ?? [],
    events: data.events ?? [],
    carouselItems: data.carouselItems ?? []
  };
}

export default function AdminPanel() {
  const { user } = useUser();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Handle loading states with proper UI feedback
  const [isLoading, setIsLoading] = React.useState(false);
  const isUpdating = isPending || isLoading;

  // Show loading state when transitions are pending
  useEffect(() => {
    if (isUpdating) {
      toast({
        title: "Loading...",
        description: "Please wait while we process your request",
        variant: "default"
      });
    }
  }, [isUpdating, toast]);

  // Display loading indicator for pending operations
  if (isUpdating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Processing your request...</p>
        </div>
      </div>
    );
  }

  // Enhanced authentication check with proper error handling
  useEffect(() => {
    let isSubscribed = true;

    const checkAndRedirect = async () => {
      if (!isSubscribed) return;

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the admin panel",
          variant: "destructive"
        });
        window.location.href = '/auth?redirect=/admin';
        return;
      }

      if (user.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "This page is only accessible to administrators",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }
    };

    checkAndRedirect();
    return () => {
      isSubscribed = false;
    };
  }, [user, toast]);

  // Early return with loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg">Checking authentication...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    );
  }

  // Early return for non-admin users
  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-destructive">Access Denied</div>
          <div className="text-sm text-muted-foreground">You don't have permission to view this page</div>
        </div>
      </div>
    );
  }

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    enabled: user?.role === 'admin'
  });

  if (!user || user.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">Ir al Inicio</Button>
            </Link>
            <Link href="/resources">
              <Button variant="outline">Recursos</Button>
            </Link>
            <Link href="/businesses">
              <Button variant="outline">Negocios</Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="carousel">Carrusel</TabsTrigger>
            <TabsTrigger value="posts">Foros</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
            <TabsTrigger value="businesses">Negocios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalUsers ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total Recursos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalResources ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalEvents ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total Negocios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalBusinesses ?? 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Gestión de Usuarios</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Administra los usuarios de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.users?.map((managedUser: User) => (
                    <div key={managedUser.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{managedUser.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {managedUser.email} | {managedUser.role} | {new Date(managedUser.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Idioma: {managedUser.language === 'es' ? 'Español' : 'English'}
                          </p>
                        </div>
                        <div className="space-x-2">
                          {user?.role === 'admin' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const newRole = managedUser.role === 'admin' ? 'user' : 'admin';
                                  startTransition(() => {
                                    (async () => {
                                      try {
                                        const response = await fetch(`/api/users/${managedUser.id}/role`, {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            role: newRole
                                          }),
                                          credentials: 'include'
                                        });

                                        if (!response.ok) {
                                          throw new Error('Failed to update user role');
                                        }

                                        await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                        toast({
                                          title: `Role updated to ${newRole}`,
                                          variant: "default"
                                        });
                                      } catch (error) {
                                        console.error('Error updating user role:', error);
                                        toast({
                                          title: "Error updating role",
                                          description: "Could not update user role",
                                          variant: "destructive"
                                        });
                                      }
                                    })();
                                  });
                                }}
                              >
                                {managedUser.role === 'admin' ? "Remove Admin" : "Make Admin"}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  if (!confirm('Are you sure you want to delete this user?')) return;
                                  
                                  startTransition(() => {
                                    (async () => {
                                      try {
                                        const response = await fetch(`/api/users/${managedUser.id}`, {
                                          method: 'DELETE',
                                          credentials: 'include'
                                        });

                                        if (!response.ok) {
                                          throw new Error('Failed to delete user');
                                        }

                                        await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                        toast({
                                          title: "User deleted",
                                          variant: "default"
                                        });
                                      } catch (error) {
                                        console.error('Error deleting user:', error);
                                        toast({
                                          title: "Error deleting user",
                                          description: "Could not delete user",
                                          variant: "destructive"
                                        });
                                      }
                                    })();
                                  });
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="carousel">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Gestión del Carrusel</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Administra los elementos del carrusel en la página principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Agregar Nuevo Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Nuevo Item al Carrusel</DialogTitle>
                        <DialogDescription>
                          Agrega un nuevo video o contenido al carrusel de la página principal.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newItem = {
                          title: formData.get('title'),
                          embedUrl: formData.get('embedUrl'),
                          description: formData.get('description'),
                          active: true
                        };

                        try {
                          const response = await fetch('/api/carousel', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(newItem),
                            credentials: 'include'
                          });

                          if (!response.ok) {
                            throw new Error('Failed to create carousel item');
                          }

                          // Refetch the stats to update the list
                          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                          (e.target as HTMLFormElement).reset();
                          
                        } catch (error) {
                          console.error('Error creating carousel item:', error);
                        }
                      }} className="space-y-4">
                        <div>
                          <Label htmlFor="title">Título</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="embedUrl">URL de Embed (YouTube, Vimeo, etc)</Label>
                          <Input id="embedUrl" name="embedUrl" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Descripción (opcional)</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Guardar</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-4">
                  {stats?.carouselItems?.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Creado: {new Date(item.createdAt).toLocaleDateString()}
                            {item.updatedAt !== item.createdAt && 
                              ` | Actualizado: ${new Date(item.updatedAt).toLocaleDateString()}`}
                          </p>
                          <p className="text-sm mt-2">URL del Video: {item.embedUrl}</p>
                          {item.description && (
                            <p className="text-sm mt-1 text-muted-foreground">{item.description}</p>
                          )}
                          <div className="mt-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              item.active 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {item.active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/carousel/${item.id}/toggle`, {
                                  method: 'POST',
                                  credentials: 'include'
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to toggle carousel item state');
                                }

                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                toast({
                                  title: item.active ? "Item desactivado" : "Item activado",
                                  variant: "default"
                                });
                              } catch (error) {
                                console.error('Error toggling carousel item:', error);
                                toast({
                                  title: "Error al cambiar estado",
                                  description: "No se pudo actualizar el estado del item",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            {item.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Item del Carrusel</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const updatedItem = {
                                  title: formData.get('title'),
                                  embedUrl: formData.get('embedUrl'),
                                  description: formData.get('description'),
                                };

                                startTransition(() => {
                                  (async () => {
                                    try {
                                      const response = await fetch(`/api/carousel/${item.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(updatedItem),
                                        credentials: 'include'
                                      });

                                      if (!response.ok) {
                                        throw new Error('Failed to update carousel item');
                                      }

                                      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                      toast({
                                        title: "Item actualizado",
                                        variant: "default"
                                      });
                                    } catch (error) {
                                      console.error('Error updating carousel item:', error);
                                      toast({
                                        title: "Error al actualizar",
                                        description: "No se pudo actualizar el item",
                                        variant: "destructive"
                                      });
                                    }
                                  })();
                                });
                              }} className="space-y-4 mt-4">
                                <div>
                                  <Label htmlFor="edit-title">Título</Label>
                                  <Input 
                                    id="edit-title" 
                                    name="title" 
                                    defaultValue={item.title}
                                    required 
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-embedUrl">URL de Embed</Label>
                                  <Input 
                                    id="edit-embedUrl" 
                                    name="embedUrl" 
                                    defaultValue={item.embedUrl}
                                    required 
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-description">Descripción</Label>
                                  <Textarea 
                                    id="edit-description" 
                                    name="description" 
                                    defaultValue={item.description || ''}
                                  />
                                </div>
                                <DialogFooter>
                                  <Button type="submit">Guardar Cambios</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button variant="destructive" size="sm" onClick={() => {
                            startTransition(() => {
                              (async () => {
                                try {
                                  const response = await fetch(`/api/carousel/${item.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include'
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to delete carousel item');
                                  }

                                  await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                  toast({
                                    title: "Item eliminado",
                                    variant: "default"
                                  });
                                } catch (error) {
                                  console.error('Error deleting carousel item:', error);
                                  toast({
                                    title: "Error al eliminar",
                                    description: "No se pudo eliminar el item",
                                    variant: "destructive"
                                  });
                                }
                              })();
                            });
                          }}>
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
                                const updatedEvent = {
                                  title: formData.get('title'),
                                  description: formData.get('description'),
                                  location: formData.get('location'),
                                  date: new Date(formData.get('date') as string),
                                };

                                try {
                                  const response = await fetch(`/api/events/${event.id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(updatedEvent),
                                    credentials: 'include'
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to update event');
                                  }

                                  queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                  queryClient.invalidateQueries({ queryKey: ['events'] });
                                } catch (error) {
                                  console.error('Error updating event:', error);
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

          <TabsContent value="businesses">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-foreground">Negocios Pendientes</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Verifica y aprueba negocios que aceptan Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.businesses?.map((business: BusinessWithSubmitter) => (
                    <div key={business.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{business.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Ubicación: {business.city} | {new Date(business.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Enviado por: {business.submitter?.username}
                          </p>
                          <p className="text-sm mt-2">{business.description}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Dirección:</span> {business.address}
                            </p>
                            {business.phone && (
                              <p className="text-sm">
                                <span className="font-medium">Teléfono:</span> {business.phone}
                              </p>
                            )}
                            {business.website && (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline block"
                              >
                                Visitar sitio web
                              </a>
                            )}
                          </div>
                          <div className="mt-2 flex gap-2">
                            {business.acceptsLightning && (
                              <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-1 text-xs font-medium text-white">
                                Lightning Network
                              </span>
                            )}
                            {business.verified ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                Verificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-x-2">
                          {!business.verified && (
                            <Button variant="outline" size="sm">
                              Verificar
                            </Button>
                          )}
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