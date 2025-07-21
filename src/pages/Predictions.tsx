import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Search, TrendingUp, TrendingDown, Target, Clock, Zap } from "lucide-react";

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
  const [predictions] = useState<Prediction[]>([
    {
      symbol: "AAPL",
      currentPrice: 182.41,
      predictedPrice: 195.30,
      confidence: 87,
      timeFrame: "7 days",
      direction: "up",
      technicalIndicators: {
        rsi: 62,
        macd: "bullish",
        movingAverage: "above",
        volume: "high"
      },
      modelAccuracy: 76.8,
      lastUpdated: "2 minutes ago"
    },
    {
      symbol: "TSLA",
      currentPrice: 248.67,
      predictedPrice: 234.20,
      confidence: 73,
      timeFrame: "5 days",
      direction: "down",
      technicalIndicators: {
        rsi: 78,
        macd: "bearish",
        movingAverage: "below",
        volume: "normal"
      },
      modelAccuracy: 82.1,
      lastUpdated: "5 minutes ago"
    },
    {
      symbol: "NVDA",
      currentPrice: 467.83,
      predictedPrice: 485.60,
      confidence: 91,
      timeFrame: "3 days",
      direction: "up",
      technicalIndicators: {
        rsi: 58,
        macd: "bullish",
        movingAverage: "above",
        volume: "high"
      },
      modelAccuracy: 89.3,
      lastUpdated: "1 minute ago"
    },
    {
      symbol: "META",
      currentPrice: 312.45,
      predictedPrice: 298.80,
      confidence: 69,
      timeFrame: "10 days",
      direction: "down",
      technicalIndicators: {
        rsi: 72,
        macd: "bearish",
        movingAverage: "above",
        volume: "normal"
      },
      modelAccuracy: 71.4,
      lastUpdated: "3 minutes ago"
    }
  ]);

  const filteredPredictions = predictions.filter(p => 
    p.symbol.toLowerCase().includes(searchSymbol.toLowerCase())
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "profit";
    if (confidence >= 60) return "neutral";
    return "loss";
  };

  const getIndicatorBadge = (value: string | number) => {
    if (typeof value === 'string') {
      return value === 'bullish' || value === 'above' || value === 'high' ? 'profit' : 
             value === 'bearish' || value === 'below' ? 'loss' : 'neutral';
    }
    if (value > 70) return 'loss'; // Overbought
    if (value < 30) return 'profit'; // Oversold
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Predictions</h1>
          <p className="text-muted-foreground">
            Machine learning powered stock price predictions with confidence scores
          </p>
        </div>
        <Badge variant="outline" className="profit border-current">
          <Brain className="h-3 w-3 mr-1" />
          ML Model v2.1
        </Badge>
      </div>

      {/* Search */}
      <Card className="trading-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search for stock predictions (e.g., AAPL, TSLA)..."
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                className="h-10"
              />
            </div>
            <Button className="trading-button">
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predictions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredPredictions.map((prediction) => {
          const potentialReturn = ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice * 100);
          
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
                    {prediction.confidence}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Prediction */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Price</p>
                    <p className="text-xl font-mono font-bold">${prediction.currentPrice.toFixed(2)}</p>
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
                        {prediction.technicalIndicators.rsi}
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

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Target className="h-3 w-3 mr-1" />
                    Add Alert
                  </Button>
                  <Button size="sm" className="trading-button">
                    <Zap className="h-3 w-3 mr-1" />
                    Quick Trade
                  </Button>
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
      </div>
    </div>
  );
}