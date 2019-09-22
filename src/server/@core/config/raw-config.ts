import {RawTemplatesConfig} from '../../../../bld/shared';

/**
 * Server configuration.
 */
export interface RawConfig {
  /**
   * Project name for docker, defaults to `remote-workspace`.
   */
  name?: string;
  /**
   * Host for the HTTP server to bind, defaults to `0.0.0.0`.
   */
  host?: string;
  /**
   * Port for the HTTP server to listen on, defaults to 8022.
   */
  port?: number;
  /**
   * Users allowed to connect the workspaces.
   */
  users: RawUserConfig[];
  /**
   * Git configurations.
   */
  git: RawGitConfig;
  /**
   * Default image of this workspace, defaults to
   * `makeflow/remote-workspace:latest` (based on `buildpack-deps:bionic`).
   *
   * You can use your own image based on it. Or if you want another linux
   * distribution from scratch, please refer to the
   * `images/remote-workspace/Dockerfile` for necessary setups.
   */
  image?: string;
  /**
   * Docker compose volume configurations.
   */
  volumes?: RawVolumesConfig;
  /**
   * Templates configurations.
   * https://github.com/makeflow/remote-workspace/blob/master/src/shared/types/raw-config.ts
   */
  templates?: RawTemplatesConfig;
}

export interface RawUserConfig {
  /**
   * Name of this user, will be set as the value of environment variable
   * `REMOTE_USER_NAME`, `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME`.
   */
  name: string;
  /**
   * Email of this user, will be set as the value of environment variable
   * `GIT_AUTHOR_EMAIL` and `GIT_COMMITTER_EMAIL`.
   */
  email: string;
  /**
   * Public key content of this user, either `publicKey` or `publicKeyFile` is
   * required.
   */
  publicKey?: string;
  /**
   * Public key file of this user, overrides `publicKey`.
   */
  publicKeyFile?: string;
}

export type GeneralDockerVolumeEntry = DockerVolumeEntry | DockerBindEntry;

export interface DockerVolumeEntry {
  type: 'volume';
  source: string;
  target: string;
}

export interface DockerBindEntry {
  type: 'bind';
  source: string;
  target: string;
}

export interface RawVolumesConfig {
  /**
   * Shared volumes.
   */
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
  /**
   * GitLab host, defaults to `gitlab.com`.
   */
  host?: string;
  /**
   * GitLab URL, defaults to `https://${host}`
   */
  url?: string;
  credentials?: {
    accessToken: string;
  };
}

export type RawGitServiceConfig =
  | RawGitHubServiceConfig
  | RawGitLabServiceConfig;

export interface RawGitConfig {
  /**
   * Identity file for cloning Git repository during initialization.
   */
  identityFile: string;
  /**
   * Git service configurations, currently used for pull/merge requests
   * information.
   */
  services?: RawGitServiceConfig[];
}
