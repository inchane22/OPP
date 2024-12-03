import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function BitcoinQRGenerator() {
  const [address, setAddress] = useState('');
  const { toast } = useToast();

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: "¡Dirección copiada!",
        description: "La dirección Bitcoin ha sido copiada al portapapeles",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Generador de QR Bitcoin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Ingresa una dirección Bitcoin"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {address && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={address}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <Button onClick={handleCopy} variant="outline" className="w-full">
                Copiar Dirección
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
