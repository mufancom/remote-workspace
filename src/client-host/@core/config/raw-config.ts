export interface RawRemoteConfig {
  host: string;
  url?: string;
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

export interface RawConfig {
  remote: RawRemoteConfig;
  port?: number;
  vscodeExecutable?: string;
  sshConfig?: string;
  gitServices?: RawGitServiceConfig[];
}
