import Hero from "../components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div>
      <Hero />

      <section className="py-16">
        <div className="container px-4 mx-auto max-w-7xl">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">{t('home.why_bitcoin')}</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{t('home.sound_money.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{t('home.sound_money.desc')}</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{t('home.financial_freedom.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{t('home.financial_freedom.desc')}</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{t('home.community.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{t('home.community.desc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">{t('home.mining.title')}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('home.mining.desc')}
              </p>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1658225282648-b199eb2a4830"
                alt="Bitcoin Mining"
                className="rounded-lg shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
