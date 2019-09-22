import * as ChildProcess from 'child_process';
import * as Path from 'path';

import * as ShellQuote from 'shell-quote';
import * as v from 'villa';

export async function writeTextFileToVolume(
  dockerComposeProjectName: string,
  volume: string,
  path: string,
  text: string,
  mode?: string,
): Promise<void> {
  if (Path.isAbsolute(path)) {
    throw new Error('The provided `path` must be relative');
  }

  let quotedPath = ShellQuote.quote([Path.posix.join('/volume', path)]);

  let commands = [`echo ${ShellQuote.quote(['-n', text])} > ${quotedPath}`];

  if (mode) {
    commands.push(`chmod ${ShellQuote.quote([mode])} ${quotedPath}`);
  }

  let subprocess = ChildProcess.spawn('docker', [
    'run',
    '--rm',
    '--volume',
    `${dockerComposeProjectName}_${volume}:/volume`,
    'alpine',
    'sh',
    '-c',
    commands.join(' && '),
  ]);

  await v.awaitable(subprocess);
}

export function createVolume(name: string): void {
  ChildProcess.spawnSync('docker', ['volume', 'create', '--name', name]);
}

export interface ParseGitURLResult {
  host: string;
  project: string;
}

export function parseGitURL(url: string): ParseGitURLResult | undefined {
  let [, host, project] = (url.match(/@(.+?):(.+)\.git/) || []) as (
    | string
    | undefined)[];

  return host && project ? {host, project} : undefined;
}
