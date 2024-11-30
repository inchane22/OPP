import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "../hooks/use-language";

export default function Hero() {
  const { t } = useLanguage();
  return (
    <div className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center">
      {/* Background with optimized image and overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1539603658456-91b638c90c8a?auto=format&fit=crop&w=2000&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/75 to-background" />
        {/* Animated grid overlay */}
        <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(0deg,transparent,black)]" />
      </div>

      <div className="container px-4">
        <div className="relative z-10 text-center space-y-8 md:space-y-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
          {/* Main heading with gradient text */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              {t('hero.title')}
            </h1>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
          </div>

          {/* Subtitle with better contrast */}
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
            {t('hero.subtitle')}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto group"
              >
                {t('hero.join')}
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Button>
            </Link>
            <Link href="#why-bitcoin">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/20 text-white hover:bg-white/10 font-semibold w-full sm:w-auto group"
              >
                {t('hero.learn_more')}
                <span className="ml-2 group-hover:translate-y-1 transition-transform duration-200">↓</span>
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="pt-12 md:pt-16 grid grid-cols-2 md:grid-cols-3 gap-8 text-white/80">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">5000+</div>
              <div className="text-sm mt-1">Community Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100+</div>
              <div className="text-sm mt-1">Local Events</div>
            </div>
            <div className="text-center hidden md:block">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm mt-1">Bitcoin Businesses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
