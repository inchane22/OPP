import * as React from "react";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../hooks/use-language";

export function CelebrationBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useLanguage();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Small delay to trigger the animation after mount
    const timer = setTimeout(() => setShouldRender(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-in-out ${
        shouldRender ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <Alert className="rounded-none border-primary bg-primary/10 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <AlertDescription className="flex items-center text-base font-medium">
            <span className="animate-bounce inline-block mr-2">🎉</span>
            <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent font-bold">
              ¡Bitcoin alcanzó $100,000! / Bitcoin reached $100,000!
            </span>
            <span className="animate-bounce inline-block ml-2">🎉</span>
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-70 hover:opacity-100"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
