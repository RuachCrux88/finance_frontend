// Utilidad para conversión de divisas
// Usa una API gratuita de tasas de cambio

const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
let exchangeRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;

export async function getExchangeRates(baseCurrency: string = 'COP'): Promise<Record<string, number>> {
  // Si tenemos caché válido, usarlo
  if (exchangeRatesCache && Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION) {
    return exchangeRatesCache.rates;
  }

  try {
    // Usar exchangerate-api.com (gratuita, no requiere API key)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!response.ok) {
      throw new Error('Error al obtener tasas de cambio');
    }
    
    const data = await response.json();
    const rates = data.rates || {};
    
    // Guardar en caché
    exchangeRatesCache = {
      rates,
      timestamp: Date.now(),
    };
    
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Tasas de cambio aproximadas como fallback (actualizadas manualmente)
    const fallbackRates: Record<string, number> = {
      COP: 1,
      USD: 0.00024, // 1 COP = 0.00024 USD (aproximado)
      EUR: 0.00022, // 1 COP = 0.00022 EUR (aproximado)
      MXN: 0.004,   // 1 COP = 0.004 MXN (aproximado)
      ARS: 0.21,    // 1 COP = 0.21 ARS (aproximado)
    };
    
    return fallbackRates;
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    // Obtener tasas de cambio usando COP como base
    const copRates = await getExchangeRates('COP');
    
    // Si la divisa destino es COP, convertir directamente
    if (toCurrency === 'COP') {
      const fromRate = copRates[fromCurrency];
      if (!fromRate || fromRate === 0) return amount; // Si no hay tasa, retornar sin convertir
      return amount / fromRate; // Convertir de fromCurrency a COP
    }

    // Si la divisa origen es COP, convertir directamente
    if (fromCurrency === 'COP') {
      const toRate = copRates[toCurrency];
      if (!toRate || toRate === 0) return amount;
      return amount * toRate; // Convertir de COP a toCurrency
    }

    // Convertir de fromCurrency a COP, luego a toCurrency
    const fromRate = copRates[fromCurrency];
    const toRate = copRates[toCurrency];
    
    if (!fromRate || !toRate || fromRate === 0 || toRate === 0) return amount;
    
    // Convertir: amount (fromCurrency) -> COP -> toCurrency
    const inCop = amount / fromRate;
    return inCop * toRate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount; // Retornar sin convertir en caso de error
  }
}

export const CURRENCIES = [
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
];

