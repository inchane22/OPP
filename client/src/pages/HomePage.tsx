import Hero from "../components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";
import PriceDisplay from "../components/PriceDisplay";
import BitcoinQRGenerator from "../components/BitcoinQRGenerator";
import HomeCarousel from "../components/HomeCarousel";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      
      {/* Featured Content Carousel */}
      <HomeCarousel />

      {/* Price Display and Bitcoin Tools */}
      <section className="py-8">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PriceDisplay />
            <BitcoinQRGenerator />
          </div>
        </div>
      </section>

      {/* Why Bitcoin Section */}
      <section className="py-16 md:py-24 px-4 scroll-m-20" id="why-bitcoin">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
              ¿Por qué Bitcoin?
            </h2>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-6" />
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            <Card className="group transition-all duration-300 hover:shadow-xl hover:border-primary/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('home.sound_money.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {t('home.sound_money.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:shadow-xl hover:border-primary/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('home.financial_freedom.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {t('home.financial_freedom.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:shadow-xl hover:border-primary/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('home.community.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {t('home.community.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mining Section */}
      <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden scroll-m-20" id="mining">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
        <div className="container px-4 mx-auto max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                {t('home.mining.title')}
              </h2>
              <div className="h-1 w-20 bg-primary rounded-full" />
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {t('home.mining.desc')}
              </p>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <img
                src="/mining.svg"
                alt="Bitcoin Mining Equipment Illustration"
                className="rounded-xl shadow-2xl transition-all duration-300 group-hover:scale-[1.02] relative"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
