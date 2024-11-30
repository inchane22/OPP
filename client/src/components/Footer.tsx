import { Link } from "wouter";
import { Send, X } from "lucide-react";
import { useLanguage } from "../hooks/use-language";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12">
      <div className="container py-8 px-4 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          <div>
            <h3 className="font-bold text-lg mb-4">Orange Pill Peru</h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.quick_links')}</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/forum" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block"
                >
                  {t('nav.forum')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/events" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block"
                >
                  {t('nav.events')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/resources" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block"
                >
                  {t('nav.resources')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/businesses" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block"
                >
                  {t('nav.businesses')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/login" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-block"
                >
                  {t('nav.login')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.connect')}</h3>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com/orangepillperu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <X className="h-5 w-5" />
              </a>
              <a
                href="https://t.me/orangepillperu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Orange Pill Peru. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
