import { useUser } from "../hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "../hooks/use-language";

export default function AccountPage() {
  const { user } = useUser();
  const { t } = useLanguage();

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto mt-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.username} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-2">{t('account.preferences')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('account.language_preference')}: {user.language === 'es' ? 'Español' : 'English'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
