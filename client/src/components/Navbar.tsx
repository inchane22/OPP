import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser } from "../hooks/use-user";
import LanguageToggle from "./LanguageToggle";
import { User } from "@db/schema";
import { useLanguage } from "../hooks/use-language";
import { Menu } from "lucide-react";

export default function Navbar({ user }: { user: User | null | undefined }) {
  const { logout } = useUser();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-1 transition-colors hover:text-primary">
            <span className="text-lg">🍊💊🇵🇪</span>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline">Orange Pill Peru</span>
          </Link>

          <div className="hidden md:flex items-center">
            <Link href={language === 'es' ? '/foro' : '/forum'}>
              <Button variant="link" className="h-10 px-4 py-2">{t('nav.forum')}</Button>
            </Link>
            <Link href={language === 'es' ? '/eventos' : '/events'}>
              <Button variant="link" className="h-10 px-4 py-2">{t('nav.events')}</Button>
            </Link>
            <Link href={language === 'es' ? '/recursos' : '/resources'}>
              <Button variant="link" className="h-10 px-4 py-2">{t('nav.resources')}</Button>
            </Link>
            <Link href={language === 'es' ? '/negocios' : '/businesses'}>
              <Button variant="link" className="h-10 px-4 py-2">{t('nav.businesses')}</Button>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="link" className="h-10 px-4 py-2">Admin Panel</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.username} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={() => logout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">{t('nav.login')}</Button>
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[280px]">
              <nav className="flex flex-col gap-2">
                <Link 
                  href={language === 'es' ? '/foro' : '/forum'} 
                  onClick={() => setTimeout(() => setOpen(false), 150)} 
                  className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {t('nav.forum')}
                </Link>
                <Link 
                  href={language === 'es' ? '/eventos' : '/events'} 
                  onClick={() => setTimeout(() => setOpen(false), 150)} 
                  className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {t('nav.events')}
                </Link>
                <Link 
                  href={language === 'es' ? '/recursos' : '/resources'} 
                  onClick={() => setTimeout(() => setOpen(false), 150)} 
                  className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {t('nav.resources')}
                </Link>
                <Link 
                  href={language === 'es' ? '/negocios' : '/businesses'} 
                  onClick={() => setTimeout(() => setOpen(false), 150)} 
                  className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {t('nav.businesses')}
                </Link>
                {user?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    onClick={() => setTimeout(() => setOpen(false), 150)} 
                    className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
