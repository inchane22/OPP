import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useTransition, Suspense } from "react";
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
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  
  const { data, error, isFetching, isLoading } = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 3
  });

  const refreshPrice = () => {
    const refresh = async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
      } catch (error) {
        console.error('Failed to refresh price:', error);
      }
    };

    startTransition(() => {
      refresh();
    });
  };

  if (error) {
    throw error;
  }

  const isUpdating = isPending || isFetching;

  return (
    <div 
      className={`transition-opacity duration-200 ${isUpdating ? "opacity-50" : ""}`}
      onClick={refreshPrice}
    >
      <Suspense fallback={
        <Card>
          <CardContent className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      }>
        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <PriceContent data={data} />
        )}
      </Suspense>
    </div>
  );
}
