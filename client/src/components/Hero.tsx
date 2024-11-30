import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "../hooks/use-language";

export default function Hero() {
  const { t } = useLanguage();
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dynamic background with parallax effect */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105 motion-safe:animate-subtle-zoom"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=2000&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-background" />
        {/* Animated patterns overlay */}
        <div className="absolute inset-0 bg-grid-white/[0.03] [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_100%)]" />
      </div>

      <div className="container px-4 py-20 md:py-32">
        <div className="relative z-10 text-center space-y-10 md:space-y-12 max-w-5xl mx-auto">
          {/* Main heading with enhanced animation */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
            <div className="inline-block">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-white via-primary/90 to-white bg-clip-text text-transparent motion-safe:animate-gradient-x">
                  {t('hero.title')}
                </span>
              </h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-primary via-primary/80 to-primary/40 mx-auto rounded-full mt-6 motion-safe:animate-pulse" />
            </div>
          </div>

          {/* Enhanced subtitle with staggered animation */}
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-forwards">
            {t('hero.subtitle')}
          </p>

          {/* Interactive CTA section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-forwards">
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 text-lg shadow-[0_0_15px_rgba(255,165,0,0.3)] hover:shadow-[0_0_25px_rgba(255,165,0,0.5)] transform hover:scale-105 transition-all duration-300 w-full sm:w-auto group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  {t('hero.join')}
                  <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-6 text-lg backdrop-blur-sm transform hover:scale-105 transition-all duration-300 w-full sm:w-auto group"
              onClick={() => {
                const section = document.getElementById('why-bitcoin');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Por qué Bitcoin
              <span className="ml-2 group-hover:translate-y-1 transition-transform duration-300">↓</span>
            </Button>
          </div>

          {/* Enhanced trust indicators with animations */}
          <div className="pt-16 md:pt-20 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700 fill-mode-forwards">
            <div className="text-center p-6 rounded-xl backdrop-blur-sm bg-white/5 transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">5000+</div>
              <div className="text-sm mt-2 text-white/80 font-medium">Community Members</div>
            </div>
            <div className="text-center p-6 rounded-xl backdrop-blur-sm bg-white/5 transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">100+</div>
              <div className="text-sm mt-2 text-white/80 font-medium">Local Events</div>
            </div>
            <div className="text-center hidden md:block p-6 rounded-xl backdrop-blur-sm bg-white/5 transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">50+</div>
              <div className="text-sm mt-2 text-white/80 font-medium">Bitcoin Businesses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
