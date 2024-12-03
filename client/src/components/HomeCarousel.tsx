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
    <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white/[0.03] [mask-image:linear-gradient(0deg,transparent,black)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_100%)]" />
      
      <div className="container relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
            Bitcoiners Peruanos dejando huella
          </h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-6" />
        </div>

        <Carousel 
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((item) => (
              <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="group transition-all duration-300 hover:shadow-xl hover:border-primary/50 relative overflow-hidden bg-card/95 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="flex aspect-video items-center justify-center p-4">
                      <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
                        <iframe
                          src={item.embedUrl}
                          className="w-full h-full"
                          title={item.title}
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
          <CarouselPrevious className="hidden md:flex -left-4 hover:bg-primary hover:text-white transition-colors" />
          <CarouselNext className="hidden md:flex -right-4 hover:bg-primary hover:text-white transition-colors" />
        </Carousel>
      </div>
    </section>
  );
}
