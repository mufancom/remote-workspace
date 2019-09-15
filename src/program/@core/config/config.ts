import {EventEmitter} from 'events';
import * as FS from 'fs';
import * as Path from 'path';

import stripJSONComments from 'strip-json-comments';

import {RawConfig, RawUserConfig} from './raw-config';

export interface VolumesConfig {
  ssh: string;
}

export class Config extends EventEmitter {
  readonly dir: string;

  private raw!: RawConfig;

  constructor(readonly path: string) {
    super();

    this.dir = Path.dirname(path);

    this.update();
  }

  get dataDir(): string {
    let {dataDir = '.'} = this.raw;
    return Path.resolve(this.dir, dataDir);
  }

  get identity(): string {
    let {identity} = this.raw;
    let path = Path.join(this.dir, identity);

    return FS.readFileSync(path, 'utf-8');
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
