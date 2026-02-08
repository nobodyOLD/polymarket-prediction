import { CandlestickData, Time } from 'lightweight-charts';

export interface Candle extends CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TradeSetup {
  entryZone: { min: number; max: number };
  stopLoss: number;
  targets: number[];
  riskRewardRatio: number;
}

export interface AnalysisResult {
  timeframe: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  explanation: string[];
  tradeSetup: TradeSetup | null;
  openPrice: number;
  currentPrice: number;
  expectedPrice: number;
}

// -------------------------------------------------------------
// TECHNICAL INDICATORS
// -------------------------------------------------------------

function calculateEMA(candles: Candle[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  let ema = candles[0].close;
  emaArray.push(ema);

  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    emaArray.push(ema);
  }
  return emaArray;
}

function calculateRSI(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];

  let gains = 0;
  let losses = 0;

  // First RSI (Simple Average)
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsiArray: number[] = [];
  // Push initial padding
  for (let i = 0; i < period; i++) rsiArray.push(50);

  // Calculate first RSI
  let rs = avgGain / avgLoss;
  rsiArray.push(100 - (100 / (1 + rs)));

  // Smoothed RSI
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rs = avgGain / avgLoss;
    rsiArray.push(100 - (100 / (1 + rs)));
  }
  return rsiArray;
}

function getSwingHigh(candles: Candle[], lookback: number): number {
  if (candles.length < lookback) return Math.max(...candles.map(c => c.high));
  const recent = candles.slice(-lookback);
  return Math.max(...recent.map(c => c.high));
}

function getSwingLow(candles: Candle[], lookback: number): number {
  if (candles.length < lookback) return Math.min(...candles.map(c => c.low));
  const recent = candles.slice(-lookback);
  return Math.min(...recent.map(c => c.low));
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const current = candles[candles.length - i];
    const prev = candles[candles.length - i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trSum += tr;
  }
  return trSum / period;
}

function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  const macdLine: number[] = [];
  // MACD line starts when we have enough data for slowEMA
  // slowEMA is shorter than fastEMA arrays because EMA calculation starts from period
  // Actually calculateEMA returns array of same length as input, with ramp up

  for (let i = 0; i < candles.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  // Signal line is EMA of MACD Line
  // We need to calculate EMA of the macdLine array, but calculateEMA expects candles.
  // Let's create a helper for simple array EMA or reuse logic.

  const k = 2 / (signalPeriod + 1);
  const signalLine: number[] = [];
  let ema = macdLine[0];
  signalLine.push(ema);

  for (let i = 1; i < macdLine.length; i++) {
    ema = macdLine[i] * k + ema * (1 - k);
    signalLine.push(ema);
  }

  const histogram = macdLine.map((val, i) => val - signalLine[i]);

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
}

function calculateBollingerBands(candles: Candle[], period: number = 20, multiplier: number = 2) {
  const sma = candles.map((c, i) => {
    if (i < period - 1) return c.close; // Not enough data
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    return sum / period;
  });

  const bands = candles.map((c, i) => {
    if (i < period - 1) return { upper: c.close, middle: c.close, lower: c.close };

    const slice = candles.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const squaredDiffs = slice.map(val => Math.pow(val.close - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: mean + (multiplier * stdDev),
      middle: mean,
      lower: mean - (multiplier * stdDev)
    };
  });

  return bands;
}

function calculateADX(candles: Candle[], period: number = 14): number {
  if (candles.length < period * 2) return 25; // Default neutral if insufficient data

  // 1. Calculate TR, +DM, -DM
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const currentTR = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    tr.push(currentTR);

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) plusDM.push(upMove);
    else plusDM.push(0);

    if (downMove > upMove && downMove > 0) minusDM.push(downMove);
    else minusDM.push(0);
  }

  // 2. Smoothed averages
  // Simplified Wilders Smoothing: PrevAvg - (PrevAvg/n) + CurrVal
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - (smoothTR / period) + tr[i];
    smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
    smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];

    const plusDI = (smoothPlusDM / smoothTR) * 100;
    const minusDI = (smoothMinusDM / smoothTR) * 100;

    const sum = plusDI + minusDI;
    const dx = sum === 0 ? 0 : Math.abs(plusDI - minusDI) / sum * 100;
    dxList.push(dx);
  }

  // 3. ADX is SMA of DX
  if (dxList.length < period) return 25;
  const adx = dxList.slice(-period).reduce((a, b) => a + b, 0) / period;

  return adx;
}

function calculateVolumeSMA(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;
  const recent = candles.slice(-period);
  const sum = recent.reduce((acc, c) => acc + (c.volume || 0), 0);
  return sum / period;
}

// -------------------------------------------------------------
// ANALYSIS ENGINE
// -------------------------------------------------------------

export function analyzeMarket(candles: Candle[], timeframe: string = '1h'): AnalysisResult {
  if (candles.length < 50) return {
    timeframe,
    direction: 'NEUTRAL',
    confidence: 0,
    explanation: ['Insufficient Data'],
    tradeSetup: null,
    openPrice: 0,
    currentPrice: 0,
    expectedPrice: 0
  };

  const currentPrice = candles[candles.length - 1].close;
  const prevPrice = candles[candles.length - 2].close;

  // Indicators
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const rsiArray = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);
  const macdData = calculateMACD(candles);
  const bbData = calculateBollingerBands(candles);

  const adx = calculateADX(candles, 14);
  const volSMA = calculateVolumeSMA(candles, 20);
  const currentVol = candles[candles.length - 1].volume || 0;

  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];
  const rsi = rsiArray[rsiArray.length - 1];

  const macdHist = macdData.histogram[macdData.histogram.length - 1];
  const prevMacdHist = macdData.histogram[macdData.histogram.length - 2];

  const bbUpper = bbData[bbData.length - 1].upper;
  const bbLower = bbData[bbData.length - 1].lower;

  // Scoring Weights
  let score = 0; // -100 to +100
  const reasons: string[] = [];

  // 0. Trend Strength Filter (Vital)
  if (adx < 20) {
    reasons.push('Weak Trend (Low ADX)');
    // We will penalty the final confidence later
  }

  // 1. EMA Trend (Max 30 pts)
  if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50) {
    score += 25;
    reasons.push('Bullish Trend');
  } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50) {
    score -= 25;
    reasons.push('Bearish Trend');
  }

  // 2. RSI Momentum (Max 20 pts)
  // Stricter RSI: 40-60 is neutral/choppy.
  if (rsi > 55) {
    if (rsi > 75) {
      // Overbought in a strong trend is OK, but risky
      if (adx > 30) {
        score += 10;
        reasons.push('Strong Mom. (Overbought)');
      } else {
        reasons.push('RSI Overbought (Risk)');
      }
    } else {
      score += 15;
      reasons.push('Bullish RSI');
    }
  } else if (rsi < 45) {
    if (rsi < 25) {
      if (adx > 30) {
        score -= 10;
        reasons.push('Strong Sell Mom.');
      } else {
        reasons.push('RSI Oversold (Risk)');
      }
    } else {
      score -= 15;
      reasons.push('Bearish RSI');
    }
  }

  // 3. MACD Confirmation (Max 25 pts)
  if (macdHist > 0) {
    if (macdHist > prevMacdHist) {
      score += 20;
      reasons.push('MACD Strengthening');
    } else {
      score += 5;
    }
  } else {
    if (macdHist < prevMacdHist) {
      score -= 20;
      reasons.push('MACD Weakening');
    } else {
      score -= 5;
    }
  }

  // 4. Bollinger Bands (Reversal/Breakout check)
  if (currentPrice > bbUpper) {
    if (rsi > 70 && macdHist < prevMacdHist) {
      score -= 40; // High probability reversal
      reasons.push('BB Top Reversal');
    }
  } else if (currentPrice < bbLower) {
    if (rsi < 30 && macdHist > prevMacdHist) {
      score += 40; // High probability bounce
      reasons.push('BB Bottom Bounce');
    }
  }

  // 5. Volume Confirmation
  if (Math.abs(score) > 50) {
    if (currentVol < volSMA * 0.8) {
      // Low volume breakout? Suspicious.
      score = score * 0.7; // Reduce score by 30%
      reasons.push('Low Volume (Weak)');
    }
  }

  // Normalize Score with ADX/Volume Scaling
  if (adx < 25 && timeframe !== '1d') {
    // If trend is weak on lower TFs, cap max score
    score = score * 0.8;
  }

  let confidence = Math.abs(score);
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';

  if (score > 35) direction = 'UP';      // Stricter threshold (was 30)
  else if (score < -35) direction = 'DOWN';
  else confidence = 0;

  // Generate Trade Setup if clear signal
  let tradeSetup: TradeSetup | null = null;

  if (direction === 'UP' && confidence > 60) {
    const swingLow = getSwingLow(candles, 10);
    const stopLoss = swingLow - (atr * 0.5);
    const entry = currentPrice;
    const risk = entry - stopLoss;

    if (risk > 0) {
      tradeSetup = {
        entryZone: { min: Math.max(lastEMA20, swingLow), max: entry },
        stopLoss: Number(stopLoss.toFixed(4)),
        targets: [Number((entry + risk * 1.5).toFixed(4)), Number((entry + risk * 2.5).toFixed(4))],
        riskRewardRatio: 1.5
      };
    }
  } else if (direction === 'DOWN' && confidence > 60) {
    const swingHigh = getSwingHigh(candles, 10);
    const stopLoss = swingHigh + (atr * 0.5);
    const entry = currentPrice;
    const risk = stopLoss - entry;

    if (risk > 0) {
      tradeSetup = {
        entryZone: { min: entry, max: Math.min(lastEMA20, swingHigh) },
        stopLoss: Number(stopLoss.toFixed(4)),
        targets: [Number((entry - risk * 1.5).toFixed(4)), Number((entry - risk * 2.5).toFixed(4))],
        riskRewardRatio: 1.5
      };
    }
  }

  // Expected Price Calculation
  let expectedPrice = currentPrice;
  if (direction === 'UP') {
    expectedPrice = currentPrice + (atr * 0.4);
  } else if (direction === 'DOWN') {
    expectedPrice = currentPrice - (atr * 0.4);
  } else {
    expectedPrice = currentPrice;
  }

  if (tradeSetup) {
    expectedPrice = tradeSetup.targets[0];
  }

  const openPrice = candles[candles.length - 1].open;

  return {
    timeframe,
    direction,
    confidence: Math.min(confidence, 98),
    explanation: reasons.slice(0, 3) || ['Neutral Market'],
    tradeSetup,
    openPrice,
    currentPrice,
    expectedPrice
  };
}
