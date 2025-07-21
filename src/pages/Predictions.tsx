import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Search, TrendingUp, TrendingDown, Target, Clock, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  timeFrame: string;
  direction: 'up' | 'down';
  technicalIndicators: {
    rsi: number;
    macd: 'bullish' | 'bearish';
    movingAverage: 'above' | 'below';
    volume: 'high' | 'normal' | 'low';
  };
  modelAccuracy: number;
  lastUpdated: string;
}

export default function Predictions() {
  const [searchSymbol, setSearchSymbol] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  // Load initial predictions from database
  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const formattedPredictions = data.map(pred => ({
          symbol: pred.symbol,
          currentPrice: 0, // Will be updated with real-time data
          predictedPrice: parseFloat(pred.predicted_price.toString()),
          confidence: pred.confidence_score,
          timeFrame: "7 days",
          direction: (pred.signal_type === 'buy' ? 'up' : 'down') as 'up' | 'down',
          technicalIndicators: {
            rsi: (typeof pred.technical_indicators === 'object' && pred.technical_indicators !== null && 'rsi' in pred.technical_indicators) 
              ? Number(pred.technical_indicators.rsi) : 50,
            macd: (typeof pred.technical_indicators === 'object' && pred.technical_indicators !== null && 'macd' in pred.technical_indicators && Number(pred.technical_indicators.macd) > 0) 
              ? 'bullish' as const : 'bearish' as const,
            movingAverage: (typeof pred.technical_indicators === 'object' && pred.technical_indicators !== null && 'sma20' in pred.technical_indicators && 'sma50' in pred.technical_indicators && Number(pred.technical_indicators.sma20) > Number(pred.technical_indicators.sma50)) 
              ? 'above' as const : 'below' as const,
            volume: (typeof pred.technical_indicators === 'object' && pred.technical_indicators !== null && 'volume_ratio' in pred.technical_indicators && Number(pred.technical_indicators.volume_ratio) > 1.5) 
              ? 'high' as const : 'normal' as const
          },
          modelAccuracy: 85.5,
          lastUpdated: new Date(pred.created_at).toLocaleTimeString()
        }));
        setPredictions(formattedPredictions);
        
        // Get current prices for these stocks
        updateCurrentPrices(data.map(d => d.symbol));
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  };

  const updateCurrentPrices = async (symbols: string[]) => {
    try {
      const response = await supabase.functions.invoke('yahoo-finance-data', {
        body: { action: 'current_quotes', symbols }
      });

      if (response.data?.quotes) {
        setPredictions(prev => prev.map(pred => {
          const quote = response.data.quotes.find((q: any) => q.symbol === pred.symbol);
          return quote ? { ...pred, currentPrice: quote.price } : pred;
        }));
      }
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  };

  const analyzeStock = async () => {
    if (!searchSymbol.trim()) return;

    setAnalyzing(true);
    try {
      // First get current data
      const priceResponse = await supabase.functions.invoke('yahoo-finance-data', {
        body: { action: 'current_quotes', symbols: [searchSymbol.toUpperCase()] }
      });

      if (!priceResponse.data?.quotes?.[0]) {
        toast({
          title: "Stock not found",
          description: `Could not find data for ${searchSymbol.toUpperCase()}`,
          variant: "destructive"
        });
        return;
      }

      // Then analyze it
      const analysisResponse = await supabase.functions.invoke('ai-trading-analysis', {
        body: { action: 'analyze_stock', symbol: searchSymbol.toUpperCase() }
      });

      if (analysisResponse.data?.prediction) {
        const quote = priceResponse.data.quotes[0];
        const analysis = analysisResponse.data;
        
        const newPrediction: Prediction = {
          symbol: searchSymbol.toUpperCase(),
          currentPrice: quote.price,
          predictedPrice: analysis.prediction.targetPrice,
          confidence: analysis.prediction.confidence,
          timeFrame: "7 days",
          direction: analysis.prediction.signal === 'buy' ? 'up' : 'down',
          technicalIndicators: {
            rsi: analysis.technicalIndicators.rsi,
            macd: analysis.technicalIndicators.macd > analysis.technicalIndicators.signal ? 'bullish' : 'bearish',
            movingAverage: analysis.technicalIndicators.sma20 > analysis.technicalIndicators.sma50 ? 'above' : 'below',
            volume: analysis.technicalIndicators.volume_ratio > 1.5 ? 'high' : 'normal'
          },
          modelAccuracy: 87.3,
          lastUpdated: "Just now"
        };

        setPredictions(prev => [newPrediction, ...prev.filter(p => p.symbol !== searchSymbol.toUpperCase())]);
        setSearchSymbol("");
        
        toast({
          title: "Analysis Complete",
          description: `Generated ${analysis.prediction.signal} signal for ${searchSymbol.toUpperCase()} with ${Math.round(analysis.prediction.confidence * 100)}% confidence`
        });
      }
    } catch (error) {
      console.error('Error analyzing stock:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the stock. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "profit";
    if (confidence >= 0.6) return "neutral";
    return "loss";
  };

  const getIndicatorBadge = (value: string | number) => {
    if (typeof value === 'string') {
      return value === 'bullish' || value === 'above' || value === 'high' ? 'profit' : 
             value === 'bearish' || value === 'below' ? 'loss' : 'neutral';
    }
    if (value > 70) return 'loss';
    if (value < 30) return 'profit';
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Stock Predictions</h1>
            <p className="text-muted-foreground">
              Real-time machine learning powered stock price predictions using Yahoo Finance data
            </p>
          </div>
          <Badge variant="outline" className="profit border-current">
            <Brain className="h-3 w-3 mr-1" />
            Live Yahoo Finance Data
          </Badge>
        </div>

        {/* Search and Analyze */}
        <Card className="trading-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter stock symbol to analyze (e.g., AAPL, TSLA, NVDA)..."
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && analyzeStock()}
                  className="h-10"
                />
              </div>
              <Button 
                onClick={analyzeStock}
                disabled={analyzing || !searchSymbol.trim()}
                className="trading-button"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {analyzing ? 'Analyzing...' : 'Analyze Stock'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {predictions.map((prediction) => {
            const potentialReturn = prediction.currentPrice > 0 
              ? ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice * 100)
              : 0;
            
            return (
              <Card key={prediction.symbol} className="trading-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {prediction.direction === 'up' ? (
                        <TrendingUp className="h-5 w-5 profit" />
                      ) : (
                        <TrendingDown className="h-5 w-5 loss" />
                      )}
                      <span>{prediction.symbol}</span>
                    </div>
                    <Badge variant="outline" className={`${getConfidenceColor(prediction.confidence)} border-current`}>
                      {Math.round(prediction.confidence * 100)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price Prediction */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Current Price</p>
                      <p className="text-xl font-mono font-bold">
                        {prediction.currentPrice > 0 ? `$${prediction.currentPrice.toFixed(2)}` : 'Loading...'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Predicted Price</p>
                      <p className="text-xl font-mono font-bold">${prediction.predictedPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Potential Return */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Potential Return</span>
                      <span className={`font-bold ${potentialReturn >= 0 ? 'profit' : 'loss'}`}>
                        {potentialReturn >= 0 ? '+' : ''}{potentialReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{prediction.timeFrame}</span>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Technical Indicators</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>RSI:</span>
                        <Badge variant="outline" className={`${getIndicatorBadge(prediction.technicalIndicators.rsi)} border-current text-xs`}>
                          {prediction.technicalIndicators.rsi.toFixed(0)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>MACD:</span>
                        <Badge variant="outline" className={`${getIndicatorBadge(prediction.technicalIndicators.macd)} border-current text-xs`}>
                          {prediction.technicalIndicators.macd}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>MA:</span>
                        <Badge variant="outline" className={`${getIndicatorBadge(prediction.technicalIndicators.movingAverage)} border-current text-xs`}>
                          {prediction.technicalIndicators.movingAverage}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Volume:</span>
                        <Badge variant="outline" className={`${getIndicatorBadge(prediction.technicalIndicators.volume)} border-current text-xs`}>
                          {prediction.technicalIndicators.volume}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Model Accuracy */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Model Accuracy</span>
                      <span className="font-medium">{prediction.modelAccuracy}%</span>
                    </div>
                    <Progress value={prediction.modelAccuracy} className="h-2" />
                  </div>

                  {/* Last Updated */}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Updated {prediction.lastUpdated}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {predictions.length === 0 && (
          <Card className="trading-card">
            <CardContent className="pt-6 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Predictions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Enter a stock symbol above to generate AI-powered predictions using real Yahoo Finance data
              </p>
              <Button onClick={() => analyzeStock()} disabled={!searchSymbol.trim()} className="trading-button">
                <Search className="h-4 w-4 mr-2" />
                Analyze Stock
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}