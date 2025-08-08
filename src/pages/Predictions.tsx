import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock, Brain } from "lucide-react";
import AIAnalysisModal from "@/components/analysis/AIAnalysisModal";
import MarketStatusBar from "@/components/market/MarketStatusBar";

interface Prediction {
  id: string;
  symbol: string;
  predicted_price: number;
  confidence_score: number;
  signal_type: 'buy' | 'sell' | 'hold';
  created_at: string;
  expires_at: string;
  technical_indicators: any;
}

interface CurrentQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function Predictions() {
  const [searchSymbol, setSearchSymbol] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentQuotes, setCurrentQuotes] = useState<{[key: string]: CurrentQuote}>({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    
    // First try to fetch existing predictions
    const { data: existingPredictions } = await supabase
      .from('ai_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!existingPredictions || existingPredictions.length === 0) {
      // If no predictions exist, generate some for trending stocks
      await generateTrendingStocksPredictions();
    } else {
      setPredictions(existingPredictions);
      // Fetch current quotes for existing predictions
      const symbols = [...new Set(existingPredictions.map(p => p.symbol))];
      await fetchCurrentQuotes(symbols);
    }
    
    setLoading(false);
  };

  const generateTrendingStocksPredictions = async () => {
    // Daily rotating trending stocks
    const allTrendingStocks = [
      ['AAPL', 'NVDA', 'TSLA'],
      ['MSFT', 'GOOGL', 'META'], 
      ['AMZN', 'NFLX', 'AMD'],
      ['BABA', 'TSM', 'ASML'],
      ['JPM', 'V', 'MA']
    ];
    
    // Rotate based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const todaysTrending = allTrendingStocks[dayOfYear % allTrendingStocks.length];
    
    console.log('Generating predictions for trending stocks:', todaysTrending);
    
    for (const symbol of todaysTrending) {
      try {
        await supabase.functions.invoke('ai-trading-analysis', {
          body: {
            action: 'analyze_stock',
            symbol
          }
        });
      } catch (error) {
        console.error(`Error analyzing trending stock ${symbol}:`, error);
      }
    }
    
    // Fetch the newly created predictions
    await fetchPredictions();
  };

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setPredictions(data || []);
      
      // Fetch current quotes for all symbols
      if (data && data.length > 0) {
        const symbols = [...new Set(data.map(p => p.symbol))];
        await fetchCurrentQuotes(symbols);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchCurrentQuotes = async (symbols: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('yahoo-finance-data', {
        body: {
          action: 'current_quotes',
          symbols: symbols
        }
      });

      if (error) throw error;
      
      const quotesMap = (data.quotes || []).reduce((acc: any, quote: any) => {
        acc[quote.symbol] = quote;
        return acc;
      }, {});
      
      setCurrentQuotes(quotesMap);
    } catch (error) {
      console.error('Error fetching current quotes:', error);
    }
  };

  const analyzeStock = async () => {
    if (!searchSymbol.trim()) return;
    
    setAnalyzing(true);
    try {
      let symbolToAnalyze = searchSymbol.toUpperCase();
      
      // First try to search for the symbol if it's not in stock symbol format
      if (searchSymbol.length > 5 || !/^[A-Z]{1,5}$/.test(searchSymbol.toUpperCase())) {
        try {
          const { data: searchData } = await supabase.functions.invoke('yahoo-finance-data', {
            body: {
              action: 'search_stocks',
              query: searchSymbol
            }
          });
          
          if (searchData?.results && searchData.results.length > 0) {
            symbolToAnalyze = searchData.results[0].symbol;
            console.log(`Found symbol: ${symbolToAnalyze} for search: ${searchSymbol}`);
          }
        } catch (searchError) {
          console.log('Search failed, trying original symbol:', searchError);
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-trading-analysis', {
        body: {
          action: 'analyze_stock',
          symbol: symbolToAnalyze
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        return;
      }
      
      // Refresh predictions after analysis and clear search
      await fetchPredictions();
      setSearchSymbol("");
      
    } catch (error) {
      console.error('Error analyzing stock:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Add some sample data if no predictions exist
  const addSamplePredictions = async () => {
    const sampleSymbols = ['AAPL', 'MSFT', 'GOOGL'];
    setLoading(true);
    
    for (const symbol of sampleSymbols) {
      try {
        await supabase.functions.invoke('ai-trading-analysis', {
          body: {
            action: 'analyze_stock',
            symbol
          }
        });
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
      }
    }
    
    await fetchPredictions();
    setLoading(false);
  };

  const getSignalDirection = (signalType: string) => {
    return signalType === 'buy' ? 'up' : signalType === 'sell' ? 'down' : 'neutral';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hours ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} days ago`;
    }
  };

  const handlePredictionClick = (prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setShowAnalysisModal(true);
  };

  const handleCloseAnalysis = () => {
    setShowAnalysisModal(false);
    setSelectedPrediction(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Market Status Bar */}
        <MarketStatusBar />
        
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AI Stock Predictions</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Real-time machine learning powered stock price predictions using technical analysis
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="Enter stock symbol (e.g., AAPL, TSLA)..."
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && analyzeStock()}
                className="flex-1"
              />
              <Button 
                onClick={analyzeStock}
                disabled={analyzing || !searchSymbol.trim()}
                className="px-8"
              >
                {analyzing ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Stock'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Grid */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Loading Trending Stocks</h3>
              <p className="text-muted-foreground">
                Generating AI predictions for today's trending stocks...
              </p>
            </CardContent>
          </Card>
        ) : predictions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Predictions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Enter a stock symbol above to generate AI-powered predictions
              </p>
              <Button 
                onClick={addSamplePredictions}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Generating Sample Predictions...
                  </>
                ) : (
                  'Generate Sample Predictions (AAPL, MSFT, GOOGL)'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {predictions.map((prediction) => {
              const currentQuote = currentQuotes[prediction.symbol];
              const currentPrice = currentQuote?.price || 0;
              const predictedPrice = prediction.predicted_price;
              const potentialReturn = currentPrice > 0 ? 
                ((predictedPrice - currentPrice) / currentPrice * 100) : 0;
              const direction = getSignalDirection(prediction.signal_type);
              
              return (
                <Card 
                  key={prediction.id} 
                  className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handlePredictionClick(prediction)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {direction === 'up' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : direction === 'down' ? (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        ) : (
                          <Activity className="w-5 h-5 text-yellow-500" />
                        )}
                        <CardTitle className="text-xl">{prediction.symbol}</CardTitle>
                      </div>
                      <Badge 
                        variant={prediction.signal_type === 'buy' ? 'default' : 
                                prediction.signal_type === 'sell' ? 'destructive' : 'secondary'}
                      >
                        {prediction.signal_type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Confidence Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <span className="font-bold text-lg">
                        {Math.round(prediction.confidence_score * 100)}%
                      </span>
                    </div>

                    {/* Price Prediction */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-lg font-mono font-bold">
                          ${currentPrice > 0 ? currentPrice.toFixed(2) : 'Loading...'}
                        </p>
                        {currentQuote && (
                          <p className={`text-xs ${currentQuote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {currentQuote.change >= 0 ? '+' : ''}{currentQuote.changePercent.toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Predicted Price</p>
                        <p className="text-lg font-mono font-bold">
                          ${predictedPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Potential Return */}
                    {currentPrice > 0 && (
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Potential Return</span>
                          <span className={`font-bold ${potentialReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {potentialReturn >= 0 ? '+' : ''}{potentialReturn.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Technical Indicators Preview */}
                    {prediction.technical_indicators && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Technical Signals</p>
                        <div className="flex flex-wrap gap-1">
                          {prediction.technical_indicators.rsi && (
                            <Badge variant="outline" className="text-xs">
                              RSI: {prediction.technical_indicators.rsi.toFixed(1)}
                            </Badge>
                          )}
                          {prediction.technical_indicators.macd && (
                            <Badge variant="outline" className="text-xs">
                              MACD Signal
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp and Analysis Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Updated {formatTimeAgo(prediction.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Brain className="w-3 h-3" />
                        <span>View AI Analysis</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* AI Analysis Modal */}
        <AIAnalysisModal
          prediction={selectedPrediction}
          currentPrice={selectedPrediction ? (currentQuotes[selectedPrediction.symbol]?.price || 0) : 0}
          isOpen={showAnalysisModal}
          onClose={handleCloseAnalysis}
        />
      </div>
    </div>
  );
}