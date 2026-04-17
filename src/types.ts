export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  footerMessage: string;
  logoColor: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
}

export interface CalculationItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  label?: string; // Optional label for billing
}

export interface BillData {
  items: CalculationItem[];
  total: number;
  date: string;
  billNumber: string;
}
