import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

async function fetchBitcoinPrice() {
  const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice/PEN.json');
  if (!response.ok) {
    throw new Error('Failed to fetch Bitcoin price');
  }
  return response.json();
}

function PriceContent({ data }: { data: any }) {
  const penPrice = data?.bpi?.PEN?.rate_float.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN'
  });

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Bitcoin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{penPrice}</div>
        <p className="text-sm text-muted-foreground mt-1">PEN/BTC</p>
      </CardContent>
    </Card>
  );
}

export default function PriceDisplay() {
  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    throwOnError: true // Use this instead of useErrorBoundary
  });

  if (error) {
    throw error; // Let ErrorBoundary handle it
  }

  // Initial loading state is handled by Suspense
  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={isFetching ? "opacity-50 transition-opacity duration-200" : ""}>
      <PriceContent data={data} />
    </div>
  );
}
