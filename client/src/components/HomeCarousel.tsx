import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";

// Utility function for parsing embed URLs
// Moved to top of file, no duplicate needed

// Loading spinner component with proper styling and positioning
const LoadingSpinner = React.memo(() => (
  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));

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

// Memoized carousel item display component
const CarouselItemDisplay = React.memo(({ item }: { item: CarouselItem }) => (
  <div className="p-1">
    <Card>
      <CardContent className="flex aspect-square items-center justify-center p-6">
        <div className="w-full h-full">
          <iframe
            src={getEmbedUrl(item.embedUrl)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ minHeight: '400px' }}
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  </div>
));

const CarouselDisplay = React.memo(({ items }: { items: CarouselItem[] }) => {
  const [emblaApi, setEmblaApi] = React.useState<CarouselApi | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Handle API initialization with proper transition
  const handleApiInit = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    startTransition(() => {
      setEmblaApi(api);
    });
  }, []);

  const carouselOptions = React.useMemo(() => ({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
    loop: true,
    duration: 20,
  }), []);

  const autoplayPlugin = React.useMemo(() => 
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }), []);

  return (
    <div className="relative">
      {isPending && <LoadingSpinner />}
      <Carousel 
        opts={carouselOptions}
        plugins={[autoplayPlugin]}
        setApi={handleApiInit}
        className="w-full max-w-5xl mx-auto relative"
      >
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem 
              key={item.id} 
              className="md:basis-1/2 lg:basis-1/3"
            >
              <CarouselItemDisplay item={item} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
});

CarouselDisplay.displayName = "CarouselDisplay";

export default function HomeCarousel() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();

  const { data: items = [], error } = useQuery<CarouselItem[]>({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      const response = await fetch('/api/carousel');
      if (!response.ok) {
        throw new Error('Failed to fetch carousel items');
      }
      const data = await response.json();
      return data.filter((item: CarouselItem) => item.active);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    suspense: true
  });

  // Prefetch on mount
  React.useEffect(() => {
    if (!isPending) {
      startTransition(() => {
        queryClient.prefetchQuery({
          queryKey: ['carousel-items'],
          queryFn: async () => {
            const response = await fetch('/api/carousel');
            if (!response.ok) {
              throw new Error('Failed to fetch carousel items');
            }
            return response.json();
          }
        });
      });
    }
  }, [queryClient, isPending]);

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          Bitcoiners Dejando Huella en Perú
        </h2>
        <div className="relative">
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingSpinner />}>
              {error ? (
                <div className="text-center text-red-500">
                  Failed to load carousel items
                </div>
              ) : !items?.length ? (
                <div className="text-center text-muted-foreground">
                  No items to display
                </div>
              ) : (
                <CarouselDisplay items={items} />
              )}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}