import {RawTemplatesConfig} from '../../../../bld/shared';

export interface RawUserConfig {
  name: string;
  email: string;
  publicKey: string;
}

export interface RawConfig {
  host?: string;
  port?: number;
  dataDir?: string;
  identity: string;
  users: RawUserConfig[];
  volumes?: {
    ssh?: string;
  };
  templates?: RawTemplatesConfig;
}
