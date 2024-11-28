import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Hero() {
  return (
    <div className="relative h-[600px] flex items-center justify-center">
      {/* Machu Picchu background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1539603658456-91b638c90c8a")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 text-center text-white space-y-6">
        <h1 className="text-5xl font-bold">
          Orange Pill Peru
        </h1>
        <p className="text-xl max-w-2xl mx-auto">
          La primera comunidad Bitcoiner del Perú. Únete a nosotros en la revolución financiera.
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Join the Community
          </Button>
        </Link>
      </div>
    </div>
  );
}
