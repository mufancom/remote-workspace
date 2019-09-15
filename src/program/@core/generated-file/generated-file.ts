import {EventEmitter} from 'events';
import * as Path from 'path';

import * as FS from 'fs-extra';

import {Config} from '../config';

interface GeneratedFile {
  emit(event: 'update'): boolean;

  on(event: 'update', listener: () => void): this;
}

abstract class GeneratedFile extends EventEmitter {
  constructor(readonly fileName: string, protected config: Config) {
    super();

    config.on('update', () => {
      this.update().catch(console.error);
    });
  }

  get dir(): string {
    return Path.join(this.config.dataDir, 'generated-files');
  }

  get path(): string {
    return Path.join(this.dir, this.fileName);
  }

  abstract generateContent(): Promise<string>;

  async update(): Promise<void> {
    let content = await this.generateContent();

    FS.outputFileSync(this.path, content);

    this.emit('update');
  }
}

export const AbstractGeneratedFile = GeneratedFile;

export interface IGeneratedFile extends GeneratedFile {}
