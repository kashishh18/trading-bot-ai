import React, { useState } from "react";

export default function Predictions() {
  const [searchSymbol, setSearchSymbol] = useState("");
  const [predictions] = useState([
    {
      symbol: "AAPL",
      currentPrice: 182.41,
      predictedPrice: 195.30,
      confidence: 0.87,
      direction: "up" as const,
      lastUpdated: "2 minutes ago"
    },
    {
      symbol: "TSLA", 
      currentPrice: 248.67,
      predictedPrice: 234.20,
      confidence: 0.73,
      direction: "down" as const,
      lastUpdated: "5 minutes ago"
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Stock Predictions</h1>
          <p className="text-gray-400 mt-2">
            Real-time machine learning powered stock price predictions
          </p>
        </div>

        {/* Search */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter stock symbol (e.g., AAPL, TSLA)..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-500 focus:outline-none"
            />
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium">
              Analyze Stock
            </button>
          </div>
        </div>

        {/* Predictions Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {predictions.map((prediction) => {
            const potentialReturn = ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice * 100);
            
            return (
              <div key={prediction.symbol} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {prediction.direction === 'up' ? (
                      <div className="text-green-400">↗</div>
                    ) : (
                      <div className="text-red-400">↘</div>
                    )}
                    <span className="text-xl font-bold">{prediction.symbol}</span>
                  </div>
                  <div className="bg-green-900 text-green-400 px-3 py-1 rounded text-sm">
                    {Math.round(prediction.confidence * 100)}% confidence
                  </div>
                </div>
                
                {/* Price Prediction */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Current Price</p>
                    <p className="text-xl font-mono font-bold">${prediction.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Predicted Price</p>
                    <p className="text-xl font-mono font-bold">${prediction.predictedPrice.toFixed(2)}</p>
                  </div>
                </div>

                {/* Potential Return */}
                <div className="bg-gray-700 p-3 rounded mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Potential Return</span>
                    <span className={`font-bold ${potentialReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {potentialReturn >= 0 ? '+' : ''}{potentialReturn.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Last Updated */}
                <p className="text-gray-500 text-xs text-center">
                  Updated {prediction.lastUpdated}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}