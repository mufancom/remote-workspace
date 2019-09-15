export interface RawUserConfig {
  name: string;
  email: string;
  publicKey: string;
}

export interface RawConfig {
  dataDir?: string;
  identity: string;
  users: RawUserConfig[];
  volumes?: {
    ssh?: string;
  };
}
