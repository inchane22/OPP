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
  const timeoutDuration = 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    console.log('Initiating Bitcoin price fetch...');

    const response = await fetch('/api/bitcoin/price', {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || 'Error al obtener el precio de Bitcoin';
      throw new Error(errorMessage);
    }

    if ('error' in data) {
      throw new Error(data.error);
    }

    // Validate the data structure
    if (!data?.bitcoin?.pen || typeof data.bitcoin.pen !== 'number' || data.bitcoin.pen <= 0) {
      console.error('Invalid data structure received:', data);
      throw new Error('Datos de precio inválidos');
    }

    return data;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('La solicitud ha tardado demasiado');
      }
      throw error;
    }

    throw new Error('Error desconocido al obtener el precio');
  } finally {
    clearTimeout(timeoutId);
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
    refetchInterval: 60000, // Fetch every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 5, // Increase retry attempts
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 60000), // Exponential backoff with 1-minute max
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
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Bitcoin Price</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">
            {error instanceof Error
              ? error.message
              : 'Error fetching Bitcoin price. Please try again later.'}
          </p>
          <button
            onClick={refreshPrice}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
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