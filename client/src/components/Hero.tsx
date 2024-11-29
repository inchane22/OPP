import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "../hooks/use-language";

export default function Hero() {
  const { t } = useLanguage();
  return (
    <div className="relative min-h-[400px] md:min-h-[600px] flex items-center justify-center px-4 py-16 md:py-24">
      {/* Optimized background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1539603658456-91b638c90c8a?auto=format&fit=crop&w=2000&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-background/95" />
      </div>

      <div className="relative z-10 text-center text-white space-y-6 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
          {t('hero.subtitle')}
        </p>
        <div className="pt-4">
          <Link href="/login" className="inline-block">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
              {t('hero.join')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
