import * as ChildProcess from 'child_process';
import * as Path from 'path';

import * as ShellQuote from 'shell-quote';

export function writeTextFileToVolume(
  volume: string,
  path: string,
  text: string,
  mode?: string,
): void {
  if (Path.isAbsolute(path)) {
    throw new Error('The provided `path` must be relative');
  }

  let quotedPath = ShellQuote.quote([Path.posix.join('/volume', path)]);

  let commands = [`echo ${ShellQuote.quote([text])} >> ${quotedPath}`];

  if (mode) {
    commands.push(`chmod ${ShellQuote.quote([mode])} ${quotedPath}`);
  }

  ChildProcess.spawnSync('docker', [
    'run',
    '--volume',
    `remote-dev_${volume}:/volume`,
    'alpine',
    'sh',
    '-c',
    commands.join(' && '),
  ]);
}

export function createVolume(name: string): void {
  ChildProcess.spawnSync('docker', ['volume', 'create', '--name', name]);
}
