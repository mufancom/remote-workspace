export interface RawRemoteConfig {
  host: string;
  url?: string;
}

export interface RawConfig {
  remote: RawRemoteConfig;
  port?: number;
  vscodeExecutable?: string;
  sshConfigFile?: string;
}
