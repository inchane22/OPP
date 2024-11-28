import { Link } from "wouter";
import { Twitter, Github } from "lucide-react";
import { useLanguage } from "../hooks/use-language";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Orange Pill Peru</h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.quick_links')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/forum" className="text-muted-foreground hover:text-primary">
                  Forum
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-muted-foreground hover:text-primary">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-muted-foreground hover:text-primary">
                  Resources
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
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/orangepillperu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Github className="h-5 w-5" />
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
