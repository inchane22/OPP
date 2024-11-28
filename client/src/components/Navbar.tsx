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
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl">🍊💊🇵🇪</span>
          <span className="font-bold text-xl text-primary ml-2">Orange Pill Peru</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/forum">
                <Button variant="ghost">{t('nav.forum')}</Button>
              </Link>
              <Link href="/events">
                <Button variant="ghost">{t('nav.events')}</Button>
              </Link>
              <Link href="/resources">
                <Button variant="ghost">{t('nav.resources')}</Button>
              </Link>

              <LanguageToggle />

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar>
                    <AvatarImage src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => logout()}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <LanguageToggle />
              <Link href="/login">
                <Button>{t('nav.login')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
