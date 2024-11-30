import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { insertBusinessSchema, type InsertBusiness, type Business } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, Phone, Globe, Loader2, Zap } from "lucide-react";
import { useLanguage } from "../hooks/use-language";
import { Link } from "wouter";

export default function BusinessesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["businesses"],
    queryFn: () => fetch("/api/businesses").then(res => res.json())
  });

  const form = useForm<InsertBusiness>({
    resolver: zodResolver(insertBusinessSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      phone: "",
      website: "",
      acceptsLightning: false,
      verified: false,
      submittedById: user?.id
    }
  });

  const createBusiness = useMutation({
    mutationFn: (data: InsertBusiness) =>
      fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Negocio registrado exitosamente" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error al registrar el negocio"
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
        className="h-[300px] relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1696446700082-4c95b9f5b33d")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background/90 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Negocios que Aceptan Bitcoin</h1>
          <p className="text-xl text-white/90 max-w-2xl">Descubre dónde gastar tus sats en Perú</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Negocios Verificados</h2>
        
        {user ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Registrar Negocio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Negocio</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => createBusiness.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Negocio</FormLabel>
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
                          <Textarea {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sitio Web (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="acceptsLightning"
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
                            Acepta Lightning Network
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createBusiness.isPending}>
                    {createBusiness.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Negocio
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : (
          <Link href="/login">
            <Button>Inicia Sesión para Registrar un Negocio</Button>
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {businesses?.map(business => (
          <Card key={business.id} className="group hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-200">
                {business.name}
                {business.acceptsLightning && (
                  <Zap className="inline-block ml-2 h-5 w-5 text-yellow-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{business.description}</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <span>{business.address}, {business.city}</span>
                </div>
                {business.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4 text-primary" />
                    <span>{business.phone}</span>
                  </div>
                )}
                {business.website && (
                  <div className="flex items-center text-sm">
                    <Globe className="mr-2 h-4 w-4 text-primary" />
                    <a 
                      href={business.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {business.website}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
