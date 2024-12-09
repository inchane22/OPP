import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useTransition, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

async function fetchBitcoinPrice() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pen');
  if (!response.ok) {
    throw new Error('Failed to fetch Bitcoin price');
  }
  return response.json();
}

function PriceContent({ data }: { data: any }) {
  const btcInPen = data?.bitcoin?.pen || 0;
  const penPrice = btcInPen.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN'
  });
  
  // Calculate sats per 1 PEN
  const SATS_PER_BTC = 100000000;
  const satsPerPen = SATS_PER_BTC / btcInPen;
  const formattedSatsPerPen = Math.round(satsPerPen).toLocaleString('es-PE');

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Bitcoin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{penPrice}</div>
        <p className="text-sm text-muted-foreground mt-1">PEN/BTC</p>
        <div className="mt-2">
          <div className="text-lg font-semibold text-primary">{formattedSatsPerPen} sats</div>
          <p className="text-sm text-muted-foreground">por 1 PEN</p>
        </div>
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
      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <PriceContent data={data} />
      )}
    </div>
  );
}
