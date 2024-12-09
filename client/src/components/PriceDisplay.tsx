import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useTransition, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BitcoinPriceResponse {
  bitcoin: {
    pen: number;
  };
}

async function fetchBitcoinPrice(): Promise<BitcoinPriceResponse> {
  const maxRetries = 3;
  const retryDelay = 1000;
  const timeoutDuration = 5000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Initiating Bitcoin price fetch (attempt ${attempt + 1}/${maxRetries})...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const response = await fetch('/api/bitcoin/price', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Bitcoin price data:', JSON.stringify(data, null, 2));
      
      if (!data?.bitcoin?.pen || typeof data.bitcoin.pen !== 'number') {
        console.error('Invalid data structure received:', data);
        throw new Error('Invalid price data received');
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching Bitcoin price (attempt ${attempt + 1}):`, error);
      if (error.name === 'AbortError') {
        console.log('Request timed out');
      }
      if (attempt === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  throw new Error('Failed to fetch Bitcoin price after all retries');
}

function PriceContent({ data }: { data: any }) {
  console.log('PriceContent data:', JSON.stringify(data, null, 2));
  
  const btcInPen = Number(data?.bitcoin?.pen);
  if (isNaN(btcInPen) || btcInPen <= 0) {
    console.error('Invalid BTC price in PEN:', btcInPen);
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load price data</p>
        </CardContent>
      </Card>
    );
  }
  
  console.log('btcInPen:', btcInPen);
  
  const penPrice = btcInPen.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN'
  });
  
  // Calculate sats per 1 PEN
  const SATS_PER_BTC = 100_000_000; // 100 million sats in 1 BTC
  const satsPerPen = SATS_PER_BTC / btcInPen;
  console.log('satsPerPen:', satsPerPen);
  const formattedSatsPerPen = Math.floor(satsPerPen).toLocaleString('es-PE');

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
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000)
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
