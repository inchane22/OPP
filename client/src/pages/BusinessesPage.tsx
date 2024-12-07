import React, { useState, useTransition } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../hooks/use-user";

import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MapPin, Phone, Globe, Zap } from "lucide-react";
import type { Business, InsertBusiness } from "@db/schema";

export default function BusinessesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [acceptsLightningFilter, setAcceptsLightningFilter] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: businesses, isLoading, isFetching } = useQuery<Business[]>({
    queryKey: ["businesses"],
    queryFn: async () => {
      const response = await fetch("/api/businesses");
      if (!response.ok) {
        throw new Error('Failed to fetch businesses');
      }
      return response.json();
    },
    staleTime: 5000,
    refetchOnWindowFocus: false
  });

  const filteredBusinesses = businesses?.filter(business => {
    const matchesSearch = 
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLightning = 
      acceptsLightningFilter === null || 
      business.acceptsLightning === acceptsLightningFilter;

    return matchesSearch && matchesLightning;
  });

  const form = useForm<InsertBusiness>({
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      phone: "",
      website: "",
      acceptsLightning: false,
    }
  });

  const createBusiness = useMutation({
    mutationFn: async (data: InsertBusiness) => {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create business");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast({
        title: "Negocio registrado exitosamente",
        description: "Tu negocio será revisado por nuestro equipo.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al registrar el negocio",
        description: "Por favor intenta nuevamente.",
        variant: "destructive",
      });
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

  const isRefetching = !isLoading && isFetching;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="relative h-[300px] rounded-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 absolute top-4 left-4 right-4 z-10">
          <div className="flex-1 relative">
            <Input
              placeholder="Buscar por nombre, descripción o ciudad..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                startTransition(() => {
                  setSearchTerm(value);
                });
              }}
              className="max-w-md bg-white/90 backdrop-blur-sm pr-8"
            />
            {isRefetching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant={acceptsLightningFilter === true ? "default" : "outline"}
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setAcceptsLightningFilter(current => {
                    const newValue = current === true ? null : true;
                    return newValue;
                  });
                });
              }}
              disabled={isPending}
              className="whitespace-nowrap bg-white/90 backdrop-blur-sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Lightning Network
            </Button>
          </div>
        </div>
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background/90"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1696446700082-4c95b9f5b33d")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="flex flex-col items-center justify-center text-center h-full px-4">
            <h1 className="text-4xl font-bold text-white mb-4">Negocios que Aceptan Bitcoin</h1>
            <p className="text-xl text-white/90 max-w-2xl">Descubre dónde gastar tus sats en Perú</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
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
                  <form onSubmit={form.handleSubmit(data => {
                    if (isPending || createBusiness.isPending) return;
                    startTransition(() => {
                      createBusiness.mutate(data);
                    });
                  })} className={`space-y-4 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            <Input 
                              type="tel" 
                              {...field} 
                              value={field.value || ''} 
                            />
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
                            <Input 
                              type="url" 
                              {...field} 
                              value={field.value || ''} 
                            />
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
                    <Button 
                      type="submit" 
                      disabled={createBusiness.isPending || isRefetching}
                      className="w-full"
                    >
                      {createBusiness.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        "Registrar Negocio"
                      )}
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

        <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${isPending ? 'opacity-50' : ''}`}>
          {filteredBusinesses?.map(business => (
            <Card key={business.id} className="group hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors duration-200">
                    {business.name}
                    {business.acceptsLightning && (
                      <Zap className="inline-block ml-2 h-5 w-5 text-yellow-500" />
                    )}
                  </CardTitle>
                  {business.verified && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Verificado
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-2">{business.description}</p>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="line-clamp-2">{business.address}, {business.city}</span>
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
    </div>
  );
}
