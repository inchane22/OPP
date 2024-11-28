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

export default function Navbar({ user }: { user: User }) {
  const { logout } = useUser();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/">
          <a className="flex items-center space-x-2">
            <img src="/bitcoin-logo.svg" alt="Bitcoin" className="h-8 w-8" />
            <span className="font-bold text-xl text-primary">Orange Pill Peru</span>
          </a>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center space-x-4">
          <Link href="/forum">
            <Button variant="ghost">Forum</Button>
          </Link>
          <Link href="/events">
            <Button variant="ghost">Events</Button>
          </Link>
          <Link href="/resources">
            <Button variant="ghost">Resources</Button>
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
        </div>
      </div>
    </nav>
  );
}
