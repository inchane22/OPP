import { useEffect } from "react";
import { useUser } from "../hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../hooks/use-language";

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

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  const { data: stats } = useQuery({
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
        <h1 className="text-3xl font-bold mb-6 text-foreground">Panel de Administración</h1>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="posts">Foros</TabsTrigger>
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
                  {stats?.posts?.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{post.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Por: {post.author?.username} | {new Date(post.createdAt).toLocaleDateString()}
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
                      <p className="text-sm">{post.content}</p>
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
                  {stats?.users?.map((user) => (
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
                {/* Resource approval content will go here */}
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
                {/* Business verification content will go here */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
