import {EventEmitter} from 'events';
import * as FS from 'fs';
import * as Path from 'path';

import stripJSONComments from 'strip-json-comments';

import {RawConfig, RawUserConfig} from './raw-config';

export interface VolumesConfig {
  ssh: string;
}

export class Config extends EventEmitter {
  private raw!: RawConfig;

  constructor(readonly path: string) {
    super();

    this.update();
  }

  get dataDir(): string {
    let {dataDir = '.'} = this.raw;
    return Path.resolve(this.path, '..', dataDir);
  }

  get users(): RawUserConfig[] {
    return this.raw.users;
  }

  get volumes(): VolumesConfig {
    let {volumes = {}} = this.raw;
    let {ssh = 'remote-dev-ssh'} = volumes;
    return {ssh};
  }

  update(): void {
    let jsonc = FS.readFileSync(this.path, 'utf-8');
    let json = stripJSONComments(jsonc);

    this.raw = JSON.parse(json);

    this.emit('update');
  }
}

export interface Config {
  emit(event: 'update'): boolean;

  on(event: 'update', listener: () => void): this;
}
