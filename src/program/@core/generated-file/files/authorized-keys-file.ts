import {Config} from '../../config';
import {AbstractGeneratedFile} from '../generated-file';

export class AuthorizedKeysFile extends AbstractGeneratedFile {
  constructor(config: Config) {
    super('authorized_keys', config);
  }

  get generatedContent(): string {
    let userConfigs = this.config.users;

    return [
      '# Generated file, changes directly made to this file will be override.',
      userConfigs
        .map(({name, email, publicKey}) => {
          let line = [
            [
              `environment="REMOTE_USER=${name}"`,
              `environment="REMOTE_USER_EMAIL=${email}"`,
            ].join(','),
            publicKey,
          ].join(' ');

          return `${line}\n`;
        })
        .join(''),
    ].join('\n');
  }
}
