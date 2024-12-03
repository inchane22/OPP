import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
  const { t } = useLanguage();
  
  const { data: items } = useQuery<CarouselItem[]>({
    queryKey: ['carousel-items'],
    queryFn: async () => {
      const response = await fetch('/api/carousel');
      if (!response.ok) {
        throw new Error('Failed to fetch carousel items');
      }
      return response.json();
    }
  });

  if (!items?.length) return null;

  return (
    <section className="py-12 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-8">
          Bitcoiners Peruanos dejando huella
        </h2>
        <Carousel 
          opts={{
            align: "start",
          }}
          className="w-full max-w-5xl mx-auto"
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
