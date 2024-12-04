import { useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "../hooks/use-user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../hooks/use-language";

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author?: {
    id: number;
    username: string;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  language: string;
}

interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  type: string;
  approved: boolean;
  createdAt: string;
  author?: {
    id: number;
    username: string;
  };
}

interface Business {
  id: number;
  name: string;
  description: string;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  acceptsLightning: boolean;
  verified: boolean;
  createdAt: string;
  submitter?: {
    id: number;
    username: string;
  };
}

interface CarouselItem {
  id: number;
  title: string;
  embedUrl: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number;
}

interface AdminStats {
  totalUsers: number;
  totalResources: number;
  totalEvents: number;
  totalBusinesses: number;
  posts: Post[];
  users: User[];
  resources: Resource[];
  businesses: Business[];
  carouselItems: CarouselItem[];
}

async function fetchStats() {
  const response = await fetch('/api/admin/stats', {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

export default function AdminPanel() {
  const { user } = useUser();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

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
                          <Button variant="outline" size="sm" onClick={() => {
                            // TODO: Toggle active state
                          }}>
                            {item.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            // TODO: Edit carousel item
                          }}>
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={async () => {
                            try {
                              const response = await fetch(`/api/carousel/${item.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });

                              if (!response.ok) {
                                throw new Error('Failed to delete carousel item');
                              }

                              // Refetch the stats to update the list
                              queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                            } catch (error) {
                              console.error('Error deleting carousel item:', error);
                            }
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
                  {stats?.posts?.map((post: Post) => (
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
                              try {
                                const response = await fetch(`/api/posts/${post.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include'
                                });
                                if (!response.ok) throw new Error('Failed to delete post');
                                // Invalidate both admin stats and posts queries
                                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                                queryClient.invalidateQueries({ queryKey: ['posts'] });
                              } catch (error) {
                                console.error('Error deleting post:', error);
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
                  {stats?.users?.map((user: User) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {user.email} | {user.role} | {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Idioma: {user.language === 'es' ? 'Español' : 'English'}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          {user.role !== 'admin' && (
                            <Button variant="destructive" size="sm">
                              Eliminar
                            </Button>
                          )}
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
                  {stats?.resources?.map((resource: Resource) => (
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
                              } catch (error) {
                                console.error('Error deleting resource:', error);
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
                  {stats?.businesses?.map((business: Business) => (
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
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
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