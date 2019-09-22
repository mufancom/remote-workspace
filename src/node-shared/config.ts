import {EventEmitter} from 'events';
import * as FS from 'fs';
import * as Path from 'path';

import stripJSONComments from 'strip-json-comments';

class Config<TRaw> extends EventEmitter {
  readonly path: string;
  readonly dir: string;

  protected raw!: TRaw;

  constructor(path: string) {
    super();

    path = Path.resolve(path);

    this.path = path;

    this.dir = Path.dirname(path);

    this.load();
  }

  private load(): void {
    let jsonc = FS.readFileSync(this.path, 'utf-8');
    let json = stripJSONComments(jsonc);

    this.raw = JSON.parse(json);
  }
}

export const AbstractConfig = Config;

export interface IConfig<TRaw> extends Config<TRaw> {}
