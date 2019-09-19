// @ts-check

const ChildProcess = require('child_process');
const Path = require('path');

require('villa/platform/node');

const FSE = require('fs-extra');
const {main} = require('main-function');
const v = require('villa');

/** @type {import('../../../bld/shared').WorkspaceMetadata} */
// @ts-ignore
const {projects} = require('/root/workspace/metadata.json');

main(async () => {
  // prepare projects

  let hostSet = new Set(
    projects.map(project => project.git.url.match(/@(.+?):/)[1]),
  );

  let knownHostsFileStream = FSE.createWriteStream('/root/.ssh/known_hosts', {
    encoding: 'utf8',
    flags: 'a',
    mode: 0o644,
  });

  for (let host of hostSet) {
    try {
      await spawn('ssh-keygen', ['-F', host]);
      continue;
    } catch {}

    console.info(`Adding "${host}" to known hosts...`);

    let sshKeyScanProcess = ChildProcess.spawn('ssh-keyscan', [host]);

    sshKeyScanProcess.stdout.pipe(knownHostsFileStream);
    sshKeyScanProcess.stderr.pipe(process.stderr);

    await v.awaitable(sshKeyScanProcess);
  }

  knownHostsFileStream.close();

  let gitCloneEnv = {
    ...process.env,
    GIT_SSH_COMMAND: 'ssh -i /root/.ssh/initialize-identity',
  };

  for (let {
    name,
    git: {url, branch = 'master', newBranch = branch},
    scripts = {},
  } of projects) {
    let repositoryPath = Path.join('/root/repositories', name);
    let workspacePath = Path.join('/root/workspace');
    let projectPath = Path.join(workspacePath, name);

    if (!(await exists(repositoryPath, 'directory'))) {
      await spawn('git', ['clone', '--bare', url, repositoryPath], {
        env: gitCloneEnv,
        cwd: workspacePath,
      });
    }

    if (await exists(projectPath, 'directory')) {
      continue;
    }

    await spawn(
      'git',
      [
        'clone',
        '--no-checkout',
        `--reference`,
        repositoryPath,
        url,
        projectPath,
      ],
      {env: gitCloneEnv},
    );

    await spawn('git', ['checkout', '-B', newBranch, branch], {
      cwd: projectPath,
    });

    if (scripts.initialize) {
      await exec(scripts.initialize, {
        cwd: projectPath,
      }).catch(console.error);
    }
  }
});

/**
 * @param {string} command
 * @param {(string | undefined)[]} args
 * @param {import('child_process').SpawnOptions} [options]
 */
async function spawn(command, args, options) {
  let subprocess = ChildProcess.spawn(
    command,
    args.filter(arg => typeof arg === 'string'),
    {
      shell: true,
      ...options,
    },
  );

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

  await v.awaitable(subprocess);
}

/**
 * @param {string} command
 * @param {import('child_process').ExecOptions} [options]
 */
async function exec(command, options) {
  let subprocess = ChildProcess.exec(command, options);

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

  await v.awaitable(subprocess);
}

/**
 * @param {string} path
 * @param {'file' | 'directory'} [type]
 */
async function exists(path, type) {
  return FSE.stat(path).then(
    stats => {
      switch (type) {
        case 'file':
          return stats.isFile();
        case 'directory':
          return stats.isDirectory();
        default:
          return false;
      }
    },
    () => false,
  );
}
