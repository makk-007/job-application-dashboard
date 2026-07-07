import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "customCurrencies";

// Shipped as the out-of-the-box list. AED covers UAE; users can add any
// others they need from Settings.
const DEFAULT_CURRENCIES = ["USD", "EUR", "GBP", "GHS", "CAD", "AED"];

interface CurrencyContextType {
  currencies: string[];
  addCurrency: (code: string) => { ok: boolean; error?: string };
  removeCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.every((c) => typeof c === "string")
        ) {
          return parsed;
        }
      } catch {
        // fall through to default
      }
    }
    return DEFAULT_CURRENCIES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currencies));
  }, [currencies]);

  const addCurrency = (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, error: "Enter a currency code" };
    if (!/^[A-Z]{3}$/.test(normalized)) {
      return { ok: false, error: "Use a 3-letter code, e.g. AED" };
    }
    if (currencies.includes(normalized)) {
      return { ok: false, error: `${normalized} is already in your list` };
    }
    setCurrencies((prev) => [...prev, normalized].sort());
    return { ok: true };
  };

  const removeCurrency = (code: string) => {
    setCurrencies((prev) => prev.filter((c) => c !== code));
  };

  return (
    <CurrencyContext.Provider
      value={{ currencies, addCurrency, removeCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencies() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrencies must be used within CurrencyProvider");
  }
  return ctx;
}
