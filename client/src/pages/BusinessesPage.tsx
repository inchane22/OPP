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
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");

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

  const filteredBusinesses = React.useMemo(() => {
    if (!businesses) return { filtered: [], cities: [], categories: [] };

    // Get unique cities and categories
    const cities = [...new Set(businesses.map(b => b.city))].sort();
    const categories = [...new Set(businesses.map(b => b.category))].sort();

    // Filter businesses
    let filtered = businesses.filter(business => {
      const matchesSearch = 
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLightning = 
        acceptsLightningFilter === null || 
        business.acceptsLightning === acceptsLightningFilter;

      const matchesCity = !selectedCity || business.city === selectedCity;
      const matchesCategory = !selectedCategory || business.category === selectedCategory;

      return matchesSearch && matchesLightning && matchesCity && matchesCategory;
    });

    // Sort businesses
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "city":
          return a.city.localeCompare(b.city);
        default:
          return 0;
      }
    });

    return { filtered, cities, categories };
  }, [businesses, searchTerm, acceptsLightningFilter, selectedCity, selectedCategory, sortBy]);

  const form = useForm<InsertBusiness>({
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      phone: "",
      website: "",
      category: "other",
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

  const isUpdating = isPending || isLoading || isFetching;
  const isRefetching = !isLoading && isFetching;

  // Business card loading skeleton
  const BusinessSkeleton = () => (
    <Card className="group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="w-3/4 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-2/3 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <BusinessSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="relative h-[300px] rounded-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 absolute top-4 left-4 right-4 z-20">
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
              className="max-w-md bg-white/90 backdrop-blur-sm pr-8 shadow-sm border-2 border-white/20 text-black placeholder:text-black/70"
            />
            {isRefetching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="h-10 rounded-md border bg-white/90 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCity}
              onChange={(e) => {
                startTransition(() => {
                  setSelectedCity(e.target.value);
                });
              }}
              disabled={isPending}
            >
              <option value="">Todas las ciudades</option>
              {filteredBusinesses.cities?.map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-white/90 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCategory}
              onChange={(e) => {
                startTransition(() => {
                  setSelectedCategory(e.target.value);
                });
              }}
              disabled={isPending}
            >
              <option value="">Todas las categorías</option>
              {filteredBusinesses.categories?.map(category => (
                <option key={category} value={category}>
                  {category === 'restaurant' ? 'Restaurantes' :
                   category === 'retail' ? 'Tiendas' :
                   category === 'service' ? 'Servicios' :
                   category === 'education' ? 'Educación' :
                   category === 'tourism' ? 'Turismo' :
                   'Otros'}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-white/90 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={sortBy}
              onChange={(e) => {
                startTransition(() => {
                  setSortBy(e.target.value);
                });
              }}
              disabled={isPending}
            >
              <option value="name">Ordenar por nombre</option>
              <option value="recent">Más recientes</option>
              <option value="city">Ordenar por ciudad</option>
            </select>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setAcceptsLightningFilter(current => !current);
                });
              }}
              disabled={isPending}
              className={`whitespace-nowrap ${
                acceptsLightningFilter
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-white/90 text-primary hover:bg-white"
              } shadow-md backdrop-blur-sm border border-primary font-semibold transition-colors`}
            >
              <Zap className="h-4 w-4 mr-2" />
              Lightning Network
            </Button>
          </div>
        </div>
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background/90 z-10"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1696446700082-4c95b9f5b33d")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="flex flex-col items-center justify-center text-center h-full px-4 z-10 mt-16 sm:mt-0">
            <h1 className="text-4xl font-bold text-white mb-4">Negocios que Aceptan Bitcoin</h1>
            <p className="text-xl text-white/90 max-w-2xl">Descubre dónde gastar tus sats en Perú</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Negocios Verificados</h2>
              {!isLoading && (
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredBusinesses.filtered.length} {filteredBusinesses.filtered.length === 1 ? 'negocio encontrado' : 'negocios encontrados'}
                </p>
              )}
            </div>
            
            {/* Active filters display */}
            <div className="flex flex-wrap gap-2">
              {selectedCity && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCity("")}
                  className="h-7 text-xs"
                >
                  {selectedCity} ×
                </Button>
              )}
              {selectedCategory && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCategory("")}
                  className="h-7 text-xs"
                >
                  {selectedCategory === 'restaurant' ? 'Restaurantes' :
                   selectedCategory === 'retail' ? 'Tiendas' :
                   selectedCategory === 'service' ? 'Servicios' :
                   selectedCategory === 'education' ? 'Educación' :
                   selectedCategory === 'tourism' ? 'Turismo' :
                   'Otros'} ×
                </Button>
              )}
              {acceptsLightningFilter !== null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAcceptsLightningFilter(null)}
                  className="h-7 text-xs"
                >
                  Lightning Network ×
                </Button>
              )}
              {(selectedCity || selectedCategory || acceptsLightningFilter !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCity("");
                    setSelectedCategory("");
                    setAcceptsLightningFilter(null);
                  }}
                  className="h-7 text-xs"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
          
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="restaurant">Restaurantes</option>
                              <option value="retail">Tiendas</option>
                              <option value="service">Servicios</option>
                              <option value="education">Educación</option>
                              <option value="tourism">Turismo</option>
                              <option value="other">Otros</option>
                            </select>
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

        {/* Error state */}
        {businesses instanceof Error && (
          <div className="text-center py-12">
            <div className="text-lg font-semibold text-red-600">Error al cargar los negocios</div>
            <p className="text-muted-foreground mt-2">Por favor intenta nuevamente más tarde</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["businesses"] })}
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* No results state */}
        {businesses && filteredBusinesses.filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-lg font-semibold">No se encontraron negocios</div>
            <p className="text-muted-foreground mt-2">
              Intenta ajustar los filtros o realizar una nueva búsqueda
            </p>
          </div>
        )}

        {/* Results grid */}
        {businesses && filteredBusinesses.filtered.length > 0 && (
          <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${isPending ? 'opacity-50' : ''}`}>
            {filteredBusinesses.filtered.map(business => (
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
        )}
      </div>
    </div>
  );
}
