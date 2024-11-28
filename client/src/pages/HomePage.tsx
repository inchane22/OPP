import Hero from "../components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../hooks/use-language";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-12">
      <Hero />

      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8 text-center">{t('home.why_bitcoin')}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('home.sound_money.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('home.sound_money.desc')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('home.financial_freedom.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('home.financial_freedom.desc')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('home.community.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('home.community.desc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('home.mining.title')}</h2>
              <p className="text-lg mb-6">
                {t('home.mining.desc')}
              </p>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1658225282648-b199eb2a4830"
                alt="Bitcoin Mining"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
