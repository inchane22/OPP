export interface BitcoinPriceResponse {
  bitcoin: {
    pen: number;
    provider: string;
    timestamp: number;
  };
}

export interface BitcoinPriceError {
  error: string;
  details?: string;
}
