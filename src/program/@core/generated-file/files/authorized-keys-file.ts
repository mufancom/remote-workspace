import {Config} from '../../config';
import {AbstractGeneratedFile} from '../generated-file';

export class AuthorizedKeysFile extends AbstractGeneratedFile {
  constructor(config: Config) {
    super('user-ssh/authorized_keys', config);
  }

  async generateContent(): Promise<string> {
    let userConfigs = this.config.users;

    return [
      '# Generated file, changes directly made to this file will be overridden.',
      userConfigs
        .map(({name, email, publicKey}) => {
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
        })
        .join(''),
    ].join('\n');
  }
}
