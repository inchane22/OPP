import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { BitcoinPriceResponse, BitcoinPriceError } from "@/types/bitcoin";

export default function PriceDisplay() {
  const { data, error, isLoading } = useQuery<BitcoinPriceResponse, Error>({
    queryKey: ['bitcoin-price'],
    queryFn: async () => {
      const response = await fetch('/api/bitcoin/price');
      if (!response.ok) {
        const errorData = await response.json() as BitcoinPriceError;
        throw new Error(errorData.error || 'Failed to fetch Bitcoin price');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Error loading price'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Bitcoin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">
          {data.bitcoin.pen.toLocaleString('es-PE', {
            style: 'currency',
            currency: 'PEN'
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          via {data.bitcoin.provider}
        </p>
      </CardContent>
    </Card>
  );
}