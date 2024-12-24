import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BitcoinPrice {
  bitcoin: {
    pen: number;
    provider: string;
    timestamp: number;
  };
}

export default function PriceDisplay() {
  const { data, error, isLoading } = useQuery<BitcoinPrice>({
    queryKey: ['bitcoin-price'],
    queryFn: () => fetch('/api/bitcoin/price').then(res => res.json()),
    refetchInterval: 60000
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
        <CardContent>
          <p className="text-red-500">Error loading price</p>
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