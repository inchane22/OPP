import { useLanguage } from "../hooks/use-language";

export default function HomePage() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-12">
      <div className="py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('hero.title')}</h1>
        <p className="text-xl">{t('hero.subtitle')}</p>
      </div>

      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8 text-center">{t('home.why_bitcoin')}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('home.sound_money.title')}</h3>
              <p>{t('home.sound_money.desc')}</p>
            </div>

            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('home.financial_freedom.title')}</h3>
              <p>{t('home.financial_freedom.desc')}</p>
            </div>

            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('home.community.title')}</h3>
              <p>{t('home.community.desc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}