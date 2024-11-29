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
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 transition-colors hover:text-primary">
            <span className="text-2xl">🍊💊🇵🇪</span>
            <span className="font-bold text-xl ml-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Orange Pill Peru</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/forum">
              <Button variant="link">{t('nav.forum')}</Button>
            </Link>
            <Link href="/events">
              <Button variant="link">{t('nav.events')}</Button>
            </Link>
            <Link href="/resources">
              <Button variant="link">{t('nav.resources')}</Button>
            </Link>
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

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 mt-4">
                <Link href="/forum">
                  <Button variant="ghost" className="w-full justify-start">{t('nav.forum')}</Button>
                </Link>
                <Link href="/events">
                  <Button variant="ghost" className="w-full justify-start">{t('nav.events')}</Button>
                </Link>
                <Link href="/resources">
                  <Button variant="ghost" className="w-full justify-start">{t('nav.resources')}</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
