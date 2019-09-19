import {RawTemplatesConfig} from '../../../../bld/shared';

export interface RawUserConfig {
  name: string;
  email: string;
  publicKey: string;
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

export interface RawConfig {
  host?: string;
  port?: number;
  dataDir?: string;
  identity: string;
  users: RawUserConfig[];
  image?: string;
  volumes?: RawVolumesConfig;
  templates?: RawTemplatesConfig;
}
