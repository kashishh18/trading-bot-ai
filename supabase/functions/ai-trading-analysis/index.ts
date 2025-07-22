import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, symbols } = await req.json();

    switch (action) {
      case 'analyze_stock':
        return await analyzeStock(symbol);
      case 'generate_signals':
        return await generateTradingSignals(symbols || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META']);
      case 'scan_opportunities':
        return await scanOpportunities();
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in ai-trading-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeStock(symbol: string) {
  console.log(`Starting analysis for ${symbol}`);
  
  try {
    // First get current quote to validate symbol
    const { data: currentData, error: currentError } = await supabase.functions.invoke('yahoo-finance-data', {
      body: {
        action: 'current_quotes',
        symbols: [symbol]
      }
    });

    if (currentError || !currentData?.quotes?.[0]) {
      throw new Error(`Invalid or unknown stock symbol: ${symbol}`);
    }

    const currentPrice = currentData.quotes[0].price;
    console.log(`Current price for ${symbol}: ${currentPrice}`);

    // Fetch historical data from Yahoo Finance
    const { data: historicalResponse, error: fetchError } = await supabase.functions.invoke('yahoo-finance-data', {
      body: {
        action: 'historical_data',
        symbols: [symbol],
        period: '3mo',
        interval: '1d'
      }
    });

    if (fetchError || !historicalResponse?.data || historicalResponse.data.length < 20) {
      // If we can't get enough historical data, create a simplified prediction
      console.log('Using simplified analysis due to insufficient historical data');
      
      const simplePrediction = {
        signal: 'hold' as const,
        confidence: 0.3,
        targetPrice: currentPrice * (1 + (Math.random() - 0.5) * 0.05),
        reasoning: 'Limited historical data available for comprehensive analysis'
      };

      // Store simplified prediction
      const { error: insertError } = await supabase.from('ai_predictions').insert({
        symbol,
        predicted_price: simplePrediction.targetPrice,
        confidence_score: simplePrediction.confidence,
        signal_type: simplePrediction.signal,
        technical_indicators: { currentPrice, note: 'Simplified analysis' },
        prediction_date: new Date().toISOString().split('T')[0],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        model_version: 'v2.1-simple'
      });

      if (insertError) {
        console.error('Error storing simplified prediction:', insertError);
      }

      return new Response(
        JSON.stringify({ 
          symbol, 
          prediction: simplePrediction,
          message: 'Simplified analysis completed (limited historical data)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prices = historicalResponse.data
      .map((item: any) => item.close)
      .filter((price: number) => price && !isNaN(price));
    
    const volumes = historicalResponse.data
      .map((item: any) => item.volume)
      .filter((volume: number) => volume && !isNaN(volume));
    
    console.log(`Got ${prices.length} price points for analysis`);

    // Calculate technical indicators
    const rsi = calculateRSI(prices, 14);
    const { macd, signal, histogram } = calculateMACD(prices);
    const { sma20, sma50 } = calculateMovingAverages(prices);
    const { upperBand, lowerBand } = calculateBollingerBands(prices, 20, 2);
    
    const volumeAvg = volumes.length >= 10 ? 
      volumes.slice(-10).reduce((a, b) => a + b, 0) / 10 : 
      volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1] || volumeAvg;

    // Generate AI prediction
    const prediction = generatePrediction({
      rsi: rsi[rsi.length - 1],
      macd: macd[macd.length - 1],
      signal: signal[signal.length - 1],
      currentPrice,
      sma20: sma20[sma20.length - 1],
      sma50: sma50[sma50.length - 1],
      upperBand: upperBand[upperBand.length - 1],
      lowerBand: lowerBand[lowerBand.length - 1],
      volumeRatio: currentVolume / volumeAvg,
      priceChange: prices.length >= 2 ? (currentPrice - prices[prices.length - 2]) / prices[prices.length - 2] : 0
    });

    // Store prediction in database
    const { error: insertError } = await supabase.from('ai_predictions').insert({
      symbol,
      prediction_date: new Date().toISOString().split('T')[0],
      predicted_price: prediction.targetPrice,
      confidence_score: prediction.confidence,
      signal_type: prediction.signal,
      model_version: 'v2.1',
      technical_indicators: {
        rsi: rsi[rsi.length - 1],
        macd: macd[macd.length - 1],
        sma20: sma20[sma20.length - 1],
        sma50: sma50[sma50.length - 1],
        volume_ratio: currentVolume / volumeAvg,
        currentPrice
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    if (insertError) {
      console.error('Error storing prediction:', insertError);
      throw new Error(`Failed to store prediction: ${insertError.message}`);
    }

    console.log(`Analysis completed for ${symbol}`);
    return new Response(
      JSON.stringify({ 
        symbol, 
        prediction, 
        technicalIndicators: {
          rsi: rsi[rsi.length - 1],
          macd: macd[macd.length - 1],
          signal: signal[signal.length - 1],
          sma20: sma20[sma20.length - 1],
          sma50: sma50[sma50.length - 1],
          volume_ratio: currentVolume / volumeAvg
        },
        message: 'Full analysis completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`Error in analyzeStock for ${symbol}:`, error);
    throw error;
  }
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period; i <= gains.length; i++) {
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);
  
  const macd = ema12.map((value, index) => value - ema26[index]);
  const signal = calculateEMA(macd, signalPeriod);
  const histogram = macd.map((value, index) => value - signal[index]);

  return { macd, signal, histogram };
}

function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema = [prices[0]];

  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
  }

  return ema;
}

function calculateMovingAverages(prices: number[]) {
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  return { sma20, sma50 };
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateBollingerBands(prices: number[], period: number, deviation: number) {
  const sma = calculateSMA(prices, period);
  const upperBand = [];
  const lowerBand = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upperBand.push(sma[i - period + 1] + (deviation * stdDev));
    lowerBand.push(sma[i - period + 1] - (deviation * stdDev));
  }

  return { upperBand, lowerBand };
}

function generatePrediction(indicators: any) {
  let bullishScore = 0;
  let bearishScore = 0;
  let confidence = 0;

  // RSI Analysis
  if (indicators.rsi < 30) bullishScore += 0.3;
  else if (indicators.rsi > 70) bearishScore += 0.3;
  else bullishScore += 0.1;

  // MACD Analysis
  if (indicators.macd > indicators.signal) bullishScore += 0.25;
  else bearishScore += 0.25;

  // Moving Average Analysis
  if (indicators.currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
    bullishScore += 0.3;
  } else if (indicators.currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
    bearishScore += 0.3;
  }

  // Volume Analysis
  if (indicators.volumeRatio > 1.5) {
    if (indicators.priceChange > 0) bullishScore += 0.15;
    else bearishScore += 0.15;
  }

  const totalScore = bullishScore + bearishScore;
  const signal = bullishScore > bearishScore ? 'buy' : bearishScore > bullishScore ? 'sell' : 'hold';
  
  confidence = Math.min(Math.abs(bullishScore - bearishScore) * 2, 0.95);
  
  let targetPrice = indicators.currentPrice;
  if (signal === 'buy') {
    targetPrice *= (1 + 0.02 + (confidence * 0.08));
  } else if (signal === 'sell') {
    targetPrice *= (1 - 0.02 - (confidence * 0.08));
  }

  return {
    signal,
    confidence: Math.round(confidence * 100) / 100,
    targetPrice: Math.round(targetPrice * 100) / 100,
    bullishScore: Math.round(bullishScore * 100) / 100,
    bearishScore: Math.round(bearishScore * 100) / 100
  };
}

async function generateTradingSignals(symbols: string[]) {
  const signals = [];

  for (const symbol of symbols) {
    try {
      const analysis = await analyzeStock(symbol);
      const data = await analysis.json();
      
      signals.push({
        symbol,
        signal_type: data.prediction.signal,
        target_price: data.prediction.targetPrice,
        confidence_score: data.prediction.confidence,
        risk_score: 1 - data.prediction.confidence,
        reasoning: generateReasoning(data.prediction, data.technicalIndicators),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
    }
  }

  // Store signals in database
  if (signals.length > 0) {
    await supabase.from('trading_signals').insert(signals);
  }

  return new Response(
    JSON.stringify({ signals }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function generateReasoning(prediction: any, indicators: any): string {
  const reasons = [];
  
  if (indicators.rsi < 30) reasons.push("oversold conditions (RSI < 30)");
  else if (indicators.rsi > 70) reasons.push("overbought conditions (RSI > 70)");
  
  if (indicators.macd > indicators.signal) reasons.push("bullish MACD crossover");
  else reasons.push("bearish MACD signal");
  
  if (indicators.volume_ratio > 1.5) reasons.push("high volume confirmation");
  
  if (prediction.signal === 'buy') {
    reasons.unshift("Strong buy signal:");
  } else if (prediction.signal === 'sell') {
    reasons.unshift("Sell signal:");
  } else {
    reasons.unshift("Neutral signal:");
  }
  
  return reasons.join(", ");
}

async function scanOpportunities() {
  // Get top performing and declining stocks for opportunities
  const opportunities = [];
  
  return new Response(
    JSON.stringify({ opportunities }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}