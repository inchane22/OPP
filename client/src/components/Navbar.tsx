import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "../hooks/use-user";
import LanguageToggle from "./LanguageToggle";
import { User } from "@db/schema";
import { useLanguage } from "../hooks/use-language";

export default function Navbar({ user }: { user: User | null | undefined }) {
  const { logout } = useUser();
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2 transition-colors hover:text-primary">
          <span className="text-2xl">🍊💊🇵🇪</span>
          <span className="font-bold text-xl ml-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Orange Pill Peru</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/forum">
              <Button variant="ghost" size="sm">{t('nav.forum')}</Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" size="sm">{t('nav.events')}</Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" size="sm">{t('nav.resources')}</Button>
            </Link>
          </div>

          <LanguageToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar>
                  <AvatarImage src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} />
                  <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/forum" className="md:hidden">
                    {t('nav.forum')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/events" className="md:hidden">
                    {t('nav.events')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/resources" className="md:hidden">
                    {t('nav.resources')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm">{t('nav.login')}</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
