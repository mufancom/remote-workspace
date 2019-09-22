/**
 * Client configuration.
 */
export interface RawConfig {
  remote: RawRemoteConfig;
  /**
   * Local port to listen on, defaults to 8022.
   */
  port?: number;
  /**
   * Defaults to `code`.
   */
  vscodeExecutable?: string;
  /**
   * Local SSH config file used by VSCode Remote SSH, defaults to
   * `~/.ssh/config`. Remote Workspace client will automatically manage part of
   * this file with generated configs for remote workspaces.
   */
  sshConfigFile?: string;
}

export interface RawRemoteConfig {
  /**
   * Host of remote workspace server.
   */
  host: string;
  /**
   * URL of remote workspace server, defaults to `http://${host}:8022`.
   */
  url?: string;
}
