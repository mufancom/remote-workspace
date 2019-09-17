import * as OS from 'os';
import * as Path from 'path';

import {AbstractConfig} from '../../../../bld/node-shared';

import {RawConfig} from './raw-config';

export class Config extends AbstractConfig<RawConfig> {
  constructor(path: string) {
    super(path);
  }

  get vscodeExecutable(): string {
    let {vscodeExecutable = 'code'} = this.raw;
    return vscodeExecutable;
  }

  get server(): string {
    return this.raw.server;
  }

  get sshConfigFilePath(): string {
    let {sshConfig} = this.raw;

    return sshConfig
      ? Path.resolve(sshConfig)
      : Path.join(OS.homedir(), '.ssh/config');
  }
}
