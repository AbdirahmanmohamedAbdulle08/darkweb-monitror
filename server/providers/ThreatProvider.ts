export interface RawBreachRecord {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  ModifiedDate: string;
  PwnCount: number;
  Description: string;
  LogoPath?: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
  IsSubscriptionFree?: boolean;
}

export interface ProviderQueryResult {
  provider: string;
  success: boolean;
  breaches: RawBreachRecord[];
  isNotFound: boolean;
  status: number;
  errorMessage?: string;
  limitations?: string;
}

export interface ThreatProvider {
  name: string;
  code: string;
  isConfigured(): boolean;
  searchEmailBreaches(email: string): Promise<ProviderQueryResult>;
  searchDomainBreaches(domain: string): Promise<ProviderQueryResult>;
  getBreachCatalog(): Promise<RawBreachRecord[]>;
}
