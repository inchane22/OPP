import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function AdminPanel() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Panel de Administración</CardTitle>
          <CardDescription>Gestiona usuarios, contenido y configuración del sitio</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="posts">Publicaciones</TabsTrigger>
              <TabsTrigger value="events">Eventos</TabsTrigger>
              <TabsTrigger value="resources">Recursos</TabsTrigger>
              <TabsTrigger value="businesses">Negocios</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <h3 className="text-lg font-semibold mb-4">Gestión de Usuarios</h3>
              {/* User management content will go here */}
            </TabsContent>
            <TabsContent value="posts">
              <h3 className="text-lg font-semibold mb-4">Gestión de Publicaciones</h3>
              {/* Posts management content will go here */}
            </TabsContent>
            <TabsContent value="events">
              <h3 className="text-lg font-semibold mb-4">Gestión de Eventos</h3>
              {/* Events management content will go here */}
            </TabsContent>
            <TabsContent value="resources">
              <h3 className="text-lg font-semibold mb-4">Gestión de Recursos</h3>
              {/* Resources management content will go here */}
            </TabsContent>
            <TabsContent value="businesses">
              <h3 className="text-lg font-semibold mb-4">Gestión de Negocios</h3>
              {/* Businesses management content will go here */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
