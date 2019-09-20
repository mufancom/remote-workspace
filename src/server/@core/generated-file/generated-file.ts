import {EventEmitter} from 'events';
import * as Path from 'path';

import * as FS from 'fs-extra';

import {Config} from '../config';

abstract class GeneratedFile extends EventEmitter {
  constructor(readonly config: Config) {
    super();
  }

  get dir(): string {
    return Path.join(this.config.dataDir, 'generated-files');
  }

  protected async outputFile(
    path: string,
    content: string | Buffer,
    options?: FS.WriteFileOptions,
  ): Promise<void> {
    let fullPath = Path.resolve(this.dir, path);

    await FS.outputFile(fullPath, content, options);
  }
}

export const AbstractGeneratedFile = GeneratedFile;

export interface IGeneratedFile extends GeneratedFile {}
