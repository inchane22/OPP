import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
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
  
  const { data, error, isFetching } = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 3,
    suspense: true
  });

  const refreshPrice = () => {
    startTransition(() => {
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
    });
  };

  if (error) {
    throw error;
  }

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
    <div 
      className={`transition-opacity duration-200 ${isPending || isFetching ? "opacity-50" : ""}`}
      onClick={refreshPrice}
    >
      <PriceContent data={data} />
    </div>
  );
}
