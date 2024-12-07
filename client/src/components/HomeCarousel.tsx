import React, { useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay, { AutoplayOptionsType } from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";
import { Loader2 } from "lucide-react";

interface CarouselItem {
  id: number;
  title: string;
  embedUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
}

export default function HomeCarousel() {
  const { t: _ } = useLanguage();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
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

  const { data: items = [], isLoading, isFetching, error } = useQuery<CarouselItem[]>({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      const response = await fetch('/api/carousel');
      if (!response.ok) {
        throw new Error('Failed to fetch carousel items');
      }
      const data = await response.json();
      return data
        .filter((item: CarouselItem) => item.active)
        .map((item: CarouselItem) => ({
          ...item,
          embedUrl: getEmbedUrl(item.embedUrl)
        }));
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Prefetch in transition
  React.useEffect(() => {
    startTransition(() => {
      queryClient.prefetchQuery({
        queryKey: ['carousel-items'],
        queryFn: async () => {
          const response = await fetch('/api/carousel');
          if (!response.ok) {
            throw new Error('Failed to fetch carousel items');
          }
          const data = await response.json();
          return data
            .filter((item: CarouselItem) => item.active)
            .map((item: CarouselItem) => ({
              ...item,
              embedUrl: getEmbedUrl(item.embedUrl)
            }));
        }
      });
    });
  }, [queryClient]);

  const isUpdating = isPending || isFetching;

  if (error) {
    console.error('Error loading carousel:', error);
    return null;
  }

  if (!items?.length) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          Bitcoiners Dejando Huella en Perú
        </h2>
        <div className="relative">
          {isUpdating && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
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
            <CarouselContent>
              {items.map((item: CarouselItem) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center p-6">
                        <div className="w-full h-full">
                          <iframe
                            src={item.embedUrl}
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
        </div>
      </div>
    </section>
  );
}
