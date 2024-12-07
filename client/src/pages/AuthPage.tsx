import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "../hooks/use-user";
import { insertUserSchema, type InsertUser } from "@db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, isLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      language: "es",
      role: "user"
    },
  });

  const onSubmit = async (data: InsertUser) => {
    if (isLoading || isPending || isAuthLoading) return;

    try {
      setIsLoading(true);
      startTransition(async () => {
        const result = await (isLogin ? login(data) : register(data));
        
        if (!result.ok) {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.message,
          });
          return;
        }

        // Reset form on success
        form.reset();
        formRef.current?.reset();
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Authentication failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Welcome back to Orange Pill Peru"
              : "Join the Bitcoin maximalist community"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form 
              ref={formRef}
              onSubmit={form.handleSubmit(onSubmit)} 
              className={`space-y-4 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isLogin && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-sm text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button 
                type="submit" 
                className="w-full relative" 
                disabled={isLoading || isPending || isAuthLoading}
                variant={isPending ? "outline" : "default"}
              >
                {(isLoading || isPending || isAuthLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin absolute left-4" />
                )}
                <span className={isLoading || isPending || isAuthLoading ? "opacity-50" : ""}>
                  {(isLoading || isPending || isAuthLoading)
                    ? (isLogin ? "Logging in..." : "Registering...")
                    : (isLogin ? "Login" : "Register")}
                </span>
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              {isLogin
                ? "Need an account? Register"
                : "Already have an account? Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
