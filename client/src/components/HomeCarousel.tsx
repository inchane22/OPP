import * as React from "react";
import { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay, { AutoplayOptionsType } from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";

const LoadingSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

interface CarouselItem {
  id: number;
  title: string;
  embedUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
}

const CarouselDisplay = ({ items }: { items: CarouselItem[] }) => {
  const { t: _ } = useLanguage();
  const [isPending, startTransition] = React.useTransition();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect((): (() => void) | undefined => {
    if (isPending) {
      setIsLoading(true);
      return;
    }
    
    const timeout = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timeout);
  }, [isPending]);

  function getEmbedUrl(url: string): string {
    try {
      if (url.includes('youtu.be')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtube.com/embed')) {
        return url;
      }
      if (url.includes('x.com') || url.includes('twitter.com')) {
        const tweetId = url.split('/status/')[1]?.split('?')[0];
        if (tweetId) {
          return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
        }
      }
      return url;
    } catch (e) {
      console.error('Error parsing media URL:', e);
      return url;
    }
  }

  return (
    <Carousel 
      opts={{
        align: "start",
        dragFree: true,
        containScroll: "trimSnaps",
        loop: true,
        duration: 20,
        watchDrag: false,
      }}
      className="w-full max-w-5xl mx-auto relative"
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        } as AutoplayOptionsType)
      ]}
    >
      {isPending && <LoadingSpinner />}
      {isPending && <LoadingSpinner />}
      <CarouselContent className={isPending ? 'opacity-50 pointer-events-none' : ''}>
        {items.map((item: CarouselItem) => (
          <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
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
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default function HomeCarousel() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = React.useTransition();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { data: items = [], isLoading, error } = useQuery<CarouselItem[]>({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      setIsUpdating(true);
      try {
        const response = await fetch('/api/carousel');
        if (!response.ok) {
          throw new Error('Failed to fetch carousel items');
        }
        const data = await response.json();
        return data.filter((item: CarouselItem) => item.active);
      } finally {
        setIsUpdating(false);
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Prefetch data
  React.useEffect(() => {
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
  }, [queryClient]);

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/50">
        <div className="container">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error('Error loading carousel:', error);
    return null;
  }

  if (!items?.length) {
    return null;
  }

  const isActive = isLoading || isPending || isUpdating;

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          Bitcoiners Dejando Huella en Perú
        </h2>
        <div className="relative">
          <Suspense fallback={<LoadingSpinner />}>
            {isActive && <LoadingSpinner />}
            <div className={isActive ? 'opacity-50 pointer-events-none' : ''}>
              <CarouselDisplay items={items} />
            </div>
          </Suspense>
        </div>
      </div>
    </section>
  );
}
