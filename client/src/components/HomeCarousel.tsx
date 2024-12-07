import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";
import type { EmblaOptionsType } from "embla-carousel";
import type { ReactNode } from "react";

// Utility function for parsing embed URLs
const getEmbedUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.hostname.includes('youtu.be') 
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  } catch {
    return url;
  }
};

// Loading spinner component with proper styling and positioning
const LoadingSpinner = React.memo(() => (
  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

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
            title={item.title}
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

CarouselItemDisplay.displayName = "CarouselItemDisplay";

interface CarouselDisplayProps {
  items: CarouselItem[];
}

const CarouselDisplay = React.memo(({ items }: CarouselDisplayProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const carouselOptions = React.useMemo((): EmblaOptionsType => ({
    align: "center",
    dragFree: true,
    containScroll: "trimSnaps",
    loop: true,
  }), []);

  const autoplayPlugin = React.useMemo(() => 
    Autoplay({
      delay: 5000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    }), []);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Use transition for loading state
  const [_, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (items.length > 0) {
      startTransition(() => {
        setLoading(false);
      });
    }
  }, [items]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative">
      <Carousel 
        opts={carouselOptions}
        plugins={[autoplayPlugin]}
        setApi={setApi}
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

// Fetch carousel items function with proper error handling
const fetchCarouselItems = async (): Promise<CarouselItem[]> => {
  try {
    const response = await fetch('/api/carousel');
    if (!response.ok) {
      throw new Error('Failed to fetch carousel items');
    }
    const data: CarouselItem[] = await response.json();
    return data.filter((item) => item.active);
  } catch (error) {
    console.error('Error fetching carousel items:', error);
    throw error;
  }
};

export default function HomeCarousel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();

  // Use suspense: false to prevent unwanted suspense behavior
  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['carousel-items'],
    queryFn: fetchCarouselItems,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  // Prefetch data with transition
  React.useEffect(() => {
    // Wrap prefetch in startTransition to avoid UI blocking
    startTransition(() => {
      void queryClient.prefetchQuery({
        queryKey: ['carousel-items'],
        queryFn: fetchCarouselItems,
        staleTime: 30000
      });
    });

    return () => {
      void queryClient.cancelQueries({ queryKey: ['carousel-items'] });
    };
  }, [queryClient]);

  // Memoize the carousel content to prevent unnecessary re-renders
  const carouselContent = React.useMemo(() => {
    if (isPending || isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="text-center text-red-500">
          {t('carousel.error')}
        </div>
      );
    }

    const carouselItems = items as CarouselItem[];
    if (!carouselItems || carouselItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          {t('carousel.empty')}
        </div>
      );
    }

    return <CarouselDisplay items={carouselItems} />;
  }, [isPending, isLoading, error, items, t]);

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          {t('carousel.title')}
        </h2>
        <ErrorBoundary>
          <div className="relative">
            {carouselContent}
          </div>
        </ErrorBoundary>
      </div>
    </section>
  );
}
