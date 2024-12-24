import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui";
import { useToast } from "@/hooks/use-toast";

export function BitcoinPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPrice(data.bitcoin.usd);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch Bitcoin price";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error fetching Bitcoin price",
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    // Refresh price every minute
    const interval = setInterval(fetchPrice, 60000);
    
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return <div className="animate-pulse bg-muted h-8 w-32 rounded" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="text-2xl font-bold">
      ${price?.toLocaleString()}
    </div>
  );
}
