import {EventEmitter} from 'events';
import * as FS from 'fs';

import stripJSONComments from 'strip-json-comments';

class Config<TRaw> extends EventEmitter {
  protected raw!: TRaw;

  constructor(readonly path: string) {
    super();

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
