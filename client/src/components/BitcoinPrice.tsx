import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { BitcoinPrice } from "@/lib/utils";

export function BitcoinPrice() {
  const [price, setPrice] = useState<BitcoinPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("/api/bitcoin/price");

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        setPrice(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch Bitcoin price";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error fetching Bitcoin price",
          description: errorMessage,
          duration: 5000
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    // Refresh price every 5 minutes to avoid rate limits
    const interval = setInterval(fetchPrice, 300000);

    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-muted h-8 w-32 rounded" />
        <span className="text-muted-foreground">Loading price...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!price?.bitcoin) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-2xl font-bold">
        {formatCurrency(price.bitcoin.pen, 'PEN')}
      </div>
      <div className="text-xs text-muted-foreground">
        Last updated: {new Date(price.bitcoin.timestamp * 1000).toLocaleTimeString()}
      </div>
    </div>
  );
}