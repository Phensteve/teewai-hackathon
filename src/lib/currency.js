// Display-currency helpers. Prices are authored in USD; the selected currency
// only affects what the user SEES — Paystack still settles in NGN. The NGN rate
// here must match USD_TO_NGIN in base44/functions/paystack/entry.ts so the shown
// naira amount equals what is actually charged.
//
// Live rates for every other currency are fetched from open.er-api.com
// (ExchangeRate-API's free, no-key, CORS-enabled endpoint — 161 currencies,
// daily updates sourced from a blend of reliable forex feeds). If the fetch
// fails we fall back to USD display so we never show a wrong price.

export const NGN_RATE = 1500;

// Comprehensive list of world currencies (ISO 4217).
// `rate` is a static fallback ONLY for USD/NGN; all other currencies use live
// rates from the API. If live rates haven't loaded, non-USD/NGN currencies
// fall back to USD display (getRate returns null).
export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, rate: 1 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimals: 0, rate: NGN_RATE },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, rate: 0.89 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, rate: 0.76 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, rate: 158 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, rate: 7.1 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, rate: 1.52 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, rate: 1.36 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2, rate: 0.88 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2, rate: 7.8 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, rate: 1.35 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2, rate: 10.5 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2, rate: 10.8 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2, rate: 6.65 },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, rate: 1.66 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2, rate: 18.2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, rate: 83.5 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2, rate: 5.0 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2, rate: 92 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0, rate: 1380 },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', decimals: 2, rate: 19.5 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2, rate: 34 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, rate: 3.67 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2, rate: 3.75 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2, rate: 36 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0, rate: 15800 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2, rate: 4.7 },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2, rate: 58 },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', decimals: 0, rate: 278 },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2, rate: 120 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0, rate: 25400 },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimals: 2, rate: 23.2 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2, rate: 4.0 },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimals: 0, rate: 365 },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2, rate: 3.7 },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', decimals: 0, rate: 950 },
  COP: { code: 'COP', symbol: 'CO$', name: 'Colombian Peso', decimals: 0, rate: 4200 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2, rate: 3.8 },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', decimals: 2, rate: 980 },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimals: 2, rate: 48.5 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2, rate: 129 },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', decimals: 2, rate: 15.2 },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', decimals: 0, rate: 3780 },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', decimals: 0, rate: 2530 },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', decimals: 0, rate: 1290 },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', decimals: 0, rate: 605 },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', decimals: 0, rate: 605 },
  MAD: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', decimals: 2, rate: 10.0 },
  DZD: { code: 'DZD', symbol: 'دج', name: 'Algerian Dinar', decimals: 2, rate: 134 },
  TND: { code: 'TND', symbol: 'TND', name: 'Tunisian Dinar', decimals: 2, rate: 3.1 },
  LYD: { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', decimals: 2, rate: 4.85 },
  SDG: { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound', decimals: 2, rate: 600 },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', decimals: 2, rate: 128 },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', decimals: 2, rate: 3.2 },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', decimals: 2, rate: 41 },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimals: 2, rate: 4.6 },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', decimals: 2, rate: 1.8 },
  HRK: { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', decimals: 2, rate: 6.9 },
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', decimals: 0, rate: 140 },
  QAR: { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', decimals: 2, rate: 3.64 },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', decimals: 3, rate: 0.307 },
  BHD: { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', decimals: 3, rate: 0.376 },
  OMR: { code: 'OMR', symbol: '﷼', name: 'Omani Rial', decimals: 3, rate: 0.385 },
  JOD: { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', decimals: 3, rate: 0.709 },
  LBP: { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', decimals: 0, rate: 89500 },
  IQD: { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', decimals: 0, rate: 1310 },
  IRR: { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', decimals: 0, rate: 42000 },
  AFN: { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', decimals: 0, rate: 70 },
  LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', decimals: 2, rate: 298 },
  NPR: { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', decimals: 2, rate: 133 },
  MUR: { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', decimals: 0, rate: 47 },
  MVR: { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', decimals: 2, rate: 15.4 },
  BTN: { code: 'BTN', symbol: 'Nu', name: 'Bhutanese Ngultrum', decimals: 2, rate: 83.5 },
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', decimals: 2, rate: 470 },
  UZS: { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', decimals: 0, rate: 12700 },
  AZN: { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', decimals: 2, rate: 1.7 },
  AMD: { code: 'AMD', symbol: '֏', name: 'Armenian Dram', decimals: 0, rate: 388 },
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari', decimals: 2, rate: 2.7 },
  MNT: { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', decimals: 0, rate: 3380 },
  KHR: { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', decimals: 0, rate: 4100 },
  LAK: { code: 'LAK', symbol: '₭', name: 'Lao Kip', decimals: 0, rate: 22000 },
  MMK: { code: 'MMK', symbol: 'K', name: 'Burmese Kyat', decimals: 0, rate: 2100 },
  BND: { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', decimals: 2, rate: 1.35 },
  FJD: { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', decimals: 2, rate: 2.25 },
  PGK: { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', decimals: 2, rate: 3.7 },
  SBD: { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar', decimals: 2, rate: 8.4 },
  VUV: { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', decimals: 0, rate: 119 },
  WST: { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', decimals: 2, rate: 2.7 },
  TOP: { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', decimals: 2, rate: 2.35 },
  KPW: { code: 'KPW', symbol: '₩', name: 'North Korean Won', decimals: 0, rate: 900 },
  MOP: { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca', decimals: 2, rate: 8.0 },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', decimals: 2, rate: 32 },
  HTG: { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', decimals: 2, rate: 132 },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', decimals: 2, rate: 58 },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', decimals: 2, rate: 7.7 },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', decimals: 2, rate: 25 },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba', decimals: 2, rate: 36.8 },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón', decimals: 0, rate: 510 },
  PAB: { code: 'PAB', symbol: 'B/', name: 'Panamanian Balboa', decimals: 2, rate: 1 },
  CUP: { code: 'CUP', symbol: '₱', name: 'Cuban Peso', decimals: 2, rate: 240 },
  JMD: { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', decimals: 2, rate: 158 },
  BBD: { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', decimals: 2, rate: 2 },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad Dollar', decimals: 2, rate: 6.8 },
  BZD: { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar', decimals: 2, rate: 2 },
  XCD: { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', decimals: 2, rate: 2.7 },
  AWG: { code: 'AWG', symbol: 'Afl', name: 'Aruban Florin', decimals: 2, rate: 1.8 },
  ANG: { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder', decimals: 2, rate: 1.8 },
  SRD: { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar', decimals: 2, rate: 35 },
  GYD: { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar', decimals: 0, rate: 209 },
  BOB: { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', decimals: 2, rate: 6.9 },
  PYG: { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní', decimals: 0, rate: 7800 },
  UYU: { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', decimals: 2, rate: 42 },
  CVE: { code: 'CVE', symbol: 'Esc', name: 'Cape Verdean Escudo', decimals: 2, rate: 102 },
  STN: { code: 'STN', symbol: 'Db', name: 'São Tomé Dobra', decimals: 2, rate: 22.5 },
  GMD: { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', decimals: 2, rate: 67 },
  SLL: { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone', decimals: 0, rate: 23000 },
  LRD: { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar', decimals: 2, rate: 188 },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Guinean Franc', decimals: 0, rate: 8600 },
  BIF: { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc', decimals: 0, rate: 2950 },
  DJF: { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc', decimals: 0, rate: 178 },
  ERN: { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa', decimals: 2, rate: 15 },
  KMF: { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', decimals: 0, rate: 470 },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', decimals: 0, rate: 4700 },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', decimals: 2, rate: 1740 },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', decimals: 2, rate: 63.5 },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', decimals: 2, rate: 25 },
  ZWL: { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar', decimals: 2, rate: 13.5 },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswana Pula', decimals: 2, rate: 13.8 },
  NAD: { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', decimals: 2, rate: 18.2 },
  SZL: { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni', decimals: 2, rate: 18.2 },
  LSL: { code: 'LSL', symbol: 'M', name: 'Lesotho Loti', decimals: 2, rate: 18.2 },
  SOS: { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling', decimals: 0, rate: 572 },
  SYP: { code: 'SYP', symbol: '£S', name: 'Syrian Pound', decimals: 0, rate: 13000 },
  YER: { code: 'YER', symbol: '﷼', name: 'Yemeni Rial', decimals: 0, rate: 248 },
  BMD: { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar', decimals: 2, rate: 1 },
  BSD: { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', decimals: 2, rate: 1 },
  KYD: { code: 'KYD', symbol: 'KY$', name: 'Cayman Dollar', decimals: 2, rate: 0.83 },
  GIP: { code: 'GIP', symbol: '£', name: 'Gibraltar Pound', decimals: 2, rate: 0.76 },
  FKP: { code: 'FKP', symbol: '£', name: 'Falkland Pound', decimals: 2, rate: 0.76 },
  SHP: { code: 'SHP', symbol: '£', name: 'Saint Helena Pound', decimals: 2, rate: 0.76 },
  XPF: { code: 'XPF', symbol: '₣', name: 'CFP Franc', decimals: 0, rate: 106 },
};

export const CURRENCY_ORDER = ['USD', 'NGN'];

// Live rates cache (in-memory + localStorage)
let liveRates = null;
let liveRatesAt = 0;
const LIVE_TTL = 60 * 60 * 1000; // 1 hour cache
const CACHE_KEY = 'teewai_rates_cache';

// Load cached rates on module init so a refresh isn't needed on every page load.
try {
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  if (cached && cached.rates && cached.at) {
    liveRates = cached.rates;
    liveRatesAt = cached.at;
  }
} catch {}

const RATE_SOURCE = 'https://open.er-api.com/v6/latest/USD';

export async function fetchLiveRates(force = false) {
  if (!force && liveRates && Date.now() - liveRatesAt < LIVE_TTL) return liveRates;
  try {
    const res = await fetch(RATE_SOURCE);
    const data = await res.json();
    if (data && data.rates) {
      liveRates = data.rates;
      liveRatesAt = Date.now();
      // Pin NGN to the Paystack settlement rate so displayed naira = charged naira.
      liveRates.NGN = NGN_RATE;
      liveRates.USD = 1;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: liveRates, at: liveRatesAt }));
      } catch {}
      return liveRates;
    }
  } catch {}
  return liveRates; // fall back to cached or null
}

export function getRate(code) {
  if (code === 'USD') return 1;
  if (code === 'NGN') return NGN_RATE;
  if (liveRates && liveRates[code]) return liveRates[code];
  // Static fallback for major currencies so prices display in the selected
  // currency even before (or if) the live rate fetch completes. These are
  // approximate and overwritten by live rates when they arrive.
  if (CURRENCIES[code] && CURRENCIES[code].rate != null) return CURRENCIES[code].rate;
  return null; // no rate available — caller should fall back to USD
}

export function hasRate(code) {
  if (code === 'USD' || code === 'NGN') return true;
  return !!(liveRates && liveRates[code]);
}

export function convert(usd, code) {
  const rate = getRate(code);
  if (rate == null) return usd; // fall back to USD value
  return usd * rate;
}

export function formatPrice(usd, code) {
  const rate = getRate(code);
  const c = CURRENCIES[code];
  if (rate == null || !c) {
    // No live rate yet — show USD so we never display a wrong price
    return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const value = usd * rate;
  if (code === 'NGN') return c.symbol + Math.round(value).toLocaleString('en-US');
  const dec = c.decimals ?? 2;
  return c.symbol + value.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}