import { useState, useTransition } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useUser } from "@/hooks/use-user";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

import { EditBusinessForm } from "@/components/EditBusinessForm";
import { Loader2 } from "lucide-react";

import type { Post, User, Resource, Business, Event } from "@/db/schema";

// Define interfaces with all required properties
interface PostWithAuthor extends Omit<Post, 'authorId'> {
  author: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    createdAt: string;
  };
}

interface ResourceWithAuthor extends Omit<Resource, 'authorId'> {
  title: string;
  author: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    createdAt: string;
  };
}

type BusinessData = Business;

interface CarouselItem {
  id: number;
  title: string;
  description: string | null;
  embedUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
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

type CarouselFormData = {
  title: string;
  description: string;
  embedUrl: string;
  active: boolean;
};

export default function AdminPanel() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<CarouselFormData>({
    defaultValues: {
      title: "",
      description: "",
      embedUrl: "",
      active: true,
    },
  });

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
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="carousel">Carousel</TabsTrigger>
          </TabsList>

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
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
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
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
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
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
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
              <CardHeader>
                <CardTitle>Gestión de Eventos</CardTitle>
                <CardDescription>Administra los eventos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.events.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
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
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
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

          {/* Carousel Tab */}
          <TabsContent value="carousel">
            <Card>
              <CardHeader>
                <CardTitle>Gestión del Carousel</CardTitle>
                <CardDescription>Administra el contenido del carousel en la página principal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">Agregar Nuevo Item</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Item al Carousel</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(async (data) => {
                          try {
                            const response = await fetch('/api/carousel', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(data),
                              credentials: 'include'
                            });

                            if (!response.ok) {
                              throw new Error('Failed to add carousel item');
                            }

                            await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                            
                            toast({
                              title: "Item agregado exitosamente",
                              variant: "default"
                            });

                            // Close dialog
                            const closeButton = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                            if (closeButton) {
                              closeButton.click();
                            }
                          } catch (error) {
                            console.error('Error adding carousel item:', error);
                            toast({
                              title: "Error al agregar item",
                              description: error instanceof Error ? error.message : "Unknown error occurred",
                              variant: "destructive"
                            });
                          }
                        })} className="space-y-4">
                          <FormField
                            control={form.control}
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
                            control={form.control}
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
                            control={form.control}
                            name="embedUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL del Embed</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    Activo
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <Button type="submit">Agregar Item</Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-4">
                    {stats?.carousel?.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{item.title}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="space-y-1 mt-2">
                              <p className="text-sm text-muted-foreground">
                                URL del Embed: {item.embedUrl}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Estado: {item.active ? 'Activo' : 'Inactivo'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Creado: {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Actualizado: {new Date(item.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="space-x-2">
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm">
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}