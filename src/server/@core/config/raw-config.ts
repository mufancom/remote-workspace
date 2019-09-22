import {RawTemplatesConfig} from '../../../../bld/shared';

export interface RawUserConfig {
  name: string;
  email: string;
  publicKey?: string;
  publicKeyFile?: string;
}

export type GeneralDockerVolumeEntry = DockerVolumeEntry;

export interface DockerVolumeEntry {
  type: 'volume';
  source: string;
  target: string;
}

export interface RawVolumesConfig {
  shared?: GeneralDockerVolumeEntry[];
}

export interface RawGitHubServiceConfig {
  type: 'github';
  credentials?: {
    accessToken: string;
  };
}

export interface RawGitLabServiceConfig {
  type: 'gitlab';
  host?: string;
  url?: string;
  credentials?: {
    accessToken: string;
  };
}

export type RawGitServiceConfig =
  | RawGitHubServiceConfig
  | RawGitLabServiceConfig;

export interface RawGitConfig {
  services?: RawGitServiceConfig[];
}

export interface RawConfig {
  name?: string;
  host?: string;
  port?: number;
  dataDir?: string;
  identityFile: string;
  users: RawUserConfig[];
  image?: string;
  volumes?: RawVolumesConfig;
  templates?: RawTemplatesConfig;
  git?: RawGitConfig;
}
