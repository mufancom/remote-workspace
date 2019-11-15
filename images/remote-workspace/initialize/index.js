// @ts-check

const ChildProcess = require('child_process');
const Path = require('path');

require('villa/platform/node');

const FSE = require('fs-extra');
const {main} = require('main-function');
const stripJSONComments = require('strip-json-comments');
const v = require('villa');

/** @type {import('../../../bld/shared').WorkspaceMetadata} */
// @ts-ignore
const {projects} = require('/root/workspace/metadata.json');

main(async () => {
  // prepare projects

  console.info('Checking project hosts...');

  let hostSet = new Set(
    projects
      .map(project => (project.git.url.match(/@(.+?):/) || [])[1])
      .filter(host => !!host),
  );

  let unknownHosts = await v.filter(Array.from(hostSet), async host => {
    try {
      await spawn('ssh-keygen', ['-F', host], {stdio: 'ignore'});
      return false;
    } catch {
      return true;
    }
  });

  if (unknownHosts.length) {
    let knownHostsFileStream = FSE.createWriteStream('/root/.ssh/known_hosts', {
      encoding: 'utf8',
      flags: 'a',
      mode: 0o644,
    });

    for (let host of unknownHosts) {
      console.info(`Adding "${host}" to known hosts...`);

      let sshKeyScanProcess = ChildProcess.spawn('ssh-keyscan', [host]);

      sshKeyScanProcess.stdout.pipe(knownHostsFileStream);

      await v.awaitable(sshKeyScanProcess);
    }

    knownHostsFileStream.close();
  }

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

    if (await exists(projectPath, 'directory')) {
      console.info(`Skipped project "${name}".`);
      continue;
    }

    console.info(`Initializing project "${name}" from "${url}"...`);

    if (!(await exists(repositoryPath, 'directory'))) {
      console.info(`Cloning bare repository...`);

      await spawn('git', ['clone', '--bare', url, repositoryPath], {
        env: gitCloneEnv,
      });
    }

    console.info(`Cloning project...`);

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

    console.info(`Checking out branch "${newBranch}" from "${branch}"...`);

    await spawn(
      'git',
      [
        'checkout',
        '-B',
        newBranch,
        `origin/${branch}`,
        newBranch !== branch ? '--no-track' : undefined,
      ],
      {cwd: projectPath},
    );

    let inPlaceProjectConfigPath = Path.join(
      projectPath,
      'remote-workspace.json',
    );

    let inPlaceProjectConfig = await gracefulReadJSONFile(
      inPlaceProjectConfigPath,
    );

    if (inPlaceProjectConfig) {
      scripts = {
        ...inPlaceProjectConfig.scripts,
        ...scripts,
      };
    }

    if (scripts.initialize) {
      console.info('Running initialization scripts...');
      console.info(scripts.initialize);

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

  if (subprocess.stdout) {
    subprocess.stdout.pipe(process.stdout);
  }

  if (subprocess.stderr) {
    subprocess.stderr.pipe(process.stderr);
  }

  await v.awaitable(subprocess);
}

/**
 * @param {string} command
 * @param {import('child_process').ExecOptions} [options]
 */
async function exec(command, options) {
  let subprocess = ChildProcess.exec(command, options);

  if (subprocess.stdout) {
    subprocess.stdout.pipe(process.stdout);
  }

  if (subprocess.stderr) {
    subprocess.stderr.pipe(process.stderr);
  }

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

/**
 * @param {string} path
 */
async function gracefulReadJSONFile(path) {
  let jsonc = await FSE.readFile(path, 'utf8').catch(() => undefined);

  let json = jsonc && stripJSONComments(jsonc);

  return json && JSON.parse(json);
}
