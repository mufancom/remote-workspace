import * as FSE from 'fs-extra';
import * as v from 'villa';

import {Config} from '../../config';
import {AbstractGeneratedFile} from '../generated-file';

import {writeTextFileToVolume} from './@utils';

export class AuthorizedKeysFile extends AbstractGeneratedFile {
  constructor(config: Config) {
    super(config);
  }

  async update(): Promise<void> {
    console.info('Updating authorized_keys...');

    let userConfigs = this.config.users;

    let lines = await v.map(
      userConfigs,
      async ({name, email, publicKey, publicKeyFile}) => {
        if (publicKeyFile) {
          publicKey = await FSE.readFile(publicKeyFile, 'utf8');
        }

        if (!publicKey) {
          throw new Error(`Missing public key for user "${name}".`);
        }

        let line = [
          [
            `environment="REMOTE_USER_NAME=${name}"`,
            `environment="REMOTE_USER_EMAIL=${email}"`,
            `environment="GIT_AUTHOR_NAME=${name}"`,
            `environment="GIT_AUTHOR_EMAIL=${email}"`,
            `environment="GIT_COMMITTER_NAME=${name}"`,
            `environment="GIT_COMMITTER_EMAIL=${email}"`,
          ].join(','),
          publicKey,
        ].join(' ');

        return `${line}\n`;
      },
    );

    let content = [
      '# Generated file, changes directly made to this file will be overridden.',
      lines.join(''),
    ].join('\n');

    await writeTextFileToVolume(
      this.config.name,
      'user-ssh',
      'authorized_keys',
      content,
    );
  }
}
