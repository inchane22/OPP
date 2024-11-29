import { Button } from "@/components/ui/button";
import { useLanguage } from "../hooks/use-language";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
    >
      {language === 'es' ? 'EN' : 'ES'}
    </Button>
  );
}
