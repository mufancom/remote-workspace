import * as Path from 'path';

import * as FS from 'fs-extra';

import {Config} from '../config';

abstract class GeneratedFile {
  constructor(readonly fileName: string, protected config: Config) {
    config.on('update', () => this.update());
  }

  get dir(): string {
    return Path.join(this.config.dataDir, 'generated-files');
  }

  get path(): string {
    return Path.join(this.dir, this.fileName);
  }

  abstract get generatedContent(): string;

  update(): void {
    FS.outputFileSync(this.path, this.generatedContent);
  }
}

export const AbstractGeneratedFile = GeneratedFile;

export interface IGeneratedFile extends GeneratedFile {}
