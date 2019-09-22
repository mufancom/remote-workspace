import * as OS from 'os';
import * as Path from 'path';

import {AbstractConfig} from '../../../../bld/node-shared';

import {RawConfig, RawGitServiceConfig} from './raw-config';

export class Config extends AbstractConfig<RawConfig> {
  constructor(path: string) {
    super(path);
  }

  get remoteURL(): string {
    let {
      remote: {host, url},
    } = this.raw;

    return url || `http://${host}:8022`;
  }

  get remoteHost(): string {
    return this.raw.remote.host;
  }

  get port(): number {
    let {port = 8022} = this.raw;
    return port;
  }

  get vscodeExecutable(): string {
    let {vscodeExecutable = 'code'} = this.raw;
    return vscodeExecutable;
  }

  get sshConfigFilePath(): string {
    let {sshConfig} = this.raw;

    return sshConfig
      ? Path.resolve(sshConfig)
      : Path.join(OS.homedir(), '.ssh/config');
  }

  get gitHostToServiceConfigMap(): Map<string, RawGitServiceConfig> {
    let {gitServices = []} = this.raw;

    if (!gitServices.some(service => service.type === 'github')) {
      gitServices.push({
        type: 'github',
      });
    }

    if (
      !gitServices.some(
        service => service.type === 'gitlab' && service.host === 'gitlab.com',
      )
    ) {
      gitServices.push({
        type: 'gitlab',
        host: 'gitlab.com',
      });
    }

    return new Map(
      gitServices.map(config => [
        config.type === 'github' ? 'github.com' : config.host || 'gitlab.com',
        config,
      ]),
    );
  }
}
