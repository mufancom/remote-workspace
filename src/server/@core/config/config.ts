import * as FS from 'fs';
import * as Path from 'path';

import {AbstractConfig} from '../../../../bld/node-shared';
import {RawTemplatesConfig} from '../../../../bld/shared';

import {
  GeneralDockerVolumeEntry,
  RawConfig,
  RawGitServiceConfig,
  RawUserConfig,
} from './raw-config';

export class Config extends AbstractConfig<RawConfig> {
  get name(): string {
    let {name = 'remote-workspace'} = this.raw;
    return name;
  }

  get host(): string {
    let {host = '0.0.0.0'} = this.raw;
    return host;
  }

  get port(): number {
    let {port = 8022} = this.raw;
    return port;
  }

  get identity(): string {
    let {
      git: {identityFile},
    } = this.raw;

    return FS.readFileSync(Path.join(this.dir, identityFile), 'utf8');
  }

  get users(): RawUserConfig[] {
    return this.raw.users;
  }

  get image(): string {
    let {image = 'makeflow/remote-workspace:latest'} = this.raw;
    return image;
  }

  get sharedVolumes(): GeneralDockerVolumeEntry[] {
    let {volumes: {shared = []} = {}} = this.raw;
    return shared;
  }

  get templates(): RawTemplatesConfig {
    let {templates = {}} = this.raw;
    return templates;
  }

  get gitHostToServiceConfigMap(): Map<string, RawGitServiceConfig> {
    let {
      git: {services = []},
    } = this.raw;

    return new Map(
      services.map(config => [
        config.type === 'github' ? 'github.com' : config.host || 'gitlab.com',
        config,
      ]),
    );
  }

  get deactivateAfterDuration(): number {
    return this.raw.deactivateWorkspaceAfter ?? 24 * 3600 * 1000;
  }
}
