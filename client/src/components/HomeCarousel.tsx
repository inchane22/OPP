import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi, type CarouselPlugin } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";

interface CarouselItem {
  id: number;
  title: string;
  embedUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number;
}

export default function HomeCarousel() {
  const { t: _ } = useLanguage(); // We'll keep the import but ignore the variable for now
  
  function getEmbedUrl(url: string): string {
    try {
      // Handle youtu.be format
      if (url.includes('youtu.be')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      // Handle youtube.com format
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${videoId}`;
      }
      // If it's already an embed URL, return as is
      if (url.includes('youtube.com/embed')) {
        return url;
      }
      // Handle X/Twitter URLs
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

  const { data: items, isLoading, error } = useQuery<CarouselItem[]>({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      const response = await fetch('/api/carousel');
      if (!response.ok) {
        throw new Error('Failed to fetch carousel items');
      }
      const data = await response.json();
      // Only show active items and transform URLs
      return data
        .filter((item: CarouselItem) => item.active)
        .map((item: CarouselItem) => ({
          ...item,
          embedUrl: getEmbedUrl(item.embedUrl)
        }));
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!items?.length) return null;

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          Bitcoiners Dejando Huella en Perú
        </h2>
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
            }) as CarouselPlugin
          ]}
        >
          <CarouselContent>
            {items.map((item) => (
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
    </section>
  );
}
