import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useTransition, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BitcoinPriceResponse {
  bitcoin: {
    pen: number;
    provider: string;
    timestamp: number;
  };
}

interface BitcoinPriceError {
  error: string;
  details?: string;
}

type FetchBitcoinPriceResult = BitcoinPriceResponse | BitcoinPriceError;

async function fetchBitcoinPrice(): Promise<BitcoinPriceResponse> {
  const timeoutDuration = 10000; // Increased timeout since we're using multiple providers
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    console.log('Initiating Bitcoin price fetch...');
    
    const response = await fetch('/api/bitcoin/price', {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json() as FetchBitcoinPriceResult;
    console.log('Bitcoin price data:', data);
    
    if ('error' in data) {
      throw new Error(data.details || data.error);
    }

    if (!data?.bitcoin?.pen || typeof data.bitcoin.pen !== 'number') {
      console.error('Invalid data structure received:', data);
      throw new Error('Invalid price data structure');
    }
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching Bitcoin price:', errorMessage);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw new Error(`Failed to fetch Bitcoin price: ${errorMessage}`);
  }
}

function PriceContent({ data }: { data: BitcoinPriceResponse }) {
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

  // Format the timestamp
  const updatedAt = new Date(data.bitcoin.timestamp);
  const timeAgo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
    Math.round((updatedAt.getTime() - Date.now()) / 1000),
    'seconds'
  );

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
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Fuente: {data.bitcoin.provider}</p>
          <p>Actualizado {timeAgo}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PriceDisplay() {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  
  const { data, error, isFetching, isLoading } = useQuery<BitcoinPriceResponse, Error>({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
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
      ) : data ? (
        <PriceContent data={data} />
      ) : null}
    </div>
  );
}
