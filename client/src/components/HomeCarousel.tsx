import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  embedUrl: string;
  active: boolean;
  createdAt: string;
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
    <section className="relative py-24 md:py-32 bg-gradient-to-b from-background via-muted/80 to-background overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-60%,#ffffff08,transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_60%,rgba(var(--primary),0.04),transparent)]" />
      
      <div className="container relative">
        <div className="relative text-center max-w-3xl mx-auto mb-20">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <h2 className="relative text-4xl md:text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-primary/90 via-primary to-primary/90 bg-clip-text text-transparent">
              Bitcoiners Peruanos
            </span>
            <br />
            <span className="text-3xl md:text-5xl text-foreground/90">dejando huella</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-primary/40 via-primary to-primary/40 mx-auto rounded-full mb-8" />
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Descubre las historias y experiencias de nuestra comunidad
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-x-4 -inset-y-16 bg-gradient-to-r from-background via-transparent to-background z-10" />
          <Carousel 
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full max-w-7xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {items.map((item) => (
                <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="group transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.2)] hover:border-primary/30 relative overflow-hidden bg-card/95 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardContent className="flex aspect-video items-center justify-center p-4">
                        <div className="w-full h-full rounded-lg overflow-hidden shadow-lg transform transition-transform duration-500 group-hover:scale-[1.02]">
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
            <CarouselPrevious className="hidden md:flex -left-6 lg:-left-12 h-12 w-12 border-primary/20 hover:bg-primary hover:text-white transition-all duration-300 opacity-75 hover:opacity-100" />
            <CarouselNext className="hidden md:flex -right-6 lg:-right-12 h-12 w-12 border-primary/20 hover:bg-primary hover:text-white transition-all duration-300 opacity-75 hover:opacity-100" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
