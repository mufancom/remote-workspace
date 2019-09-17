import * as ChildProcess from 'child_process';
import * as FS from 'fs';
import * as Path from 'path';

import 'villa/platform/node';

import stripJsonComments from 'strip-json-comments';
import * as v from 'villa';

const CONCURRENCY = Number(process.env.LINT_TS_PROJECTS_CONCURRENCY) || 4;

const [, , pattern] = process.argv;

const cwd = process.cwd();
const entranceConfigPath = normalize(cwd, 'tsconfig.json');

let configPathSet = new Set<string>();

resolve(entranceConfigPath);

let configPaths = Array.from(configPathSet);

if (pattern) {
  console.info(`Filtering with pattern "${pattern}"...`);
  configPaths = configPaths.filter(configPath => configPath.includes(pattern));
}

let havingError = false;

v.parallel(
  configPaths,
  async configPath => {
    let relativeProjectPath = Path.dirname(Path.relative(cwd, configPath));

    console.info(`Linting "${relativeProjectPath}"...`);

    let cp = ChildProcess.spawn('node', [
      'node_modules/tslint/bin/tslint',
      '--project',
      configPath,
      '--format',
      'verbose',
    ]);

    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);

    try {
      await v.awaitable(cp);
      console.info(`Done linting "${relativeProjectPath}".`);
    } catch (error) {
      havingError = true;
    }
  },
  CONCURRENCY,
)
  .then(() => {
    process.exit(havingError ? 1 : 0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

function resolve(configPath: string): void {
  let jsonc = FS.readFileSync(configPath, 'utf-8');

  interface Reference {
    path: string;
  }

  let references = JSON.parse(stripJsonComments(jsonc)).references as
    | Reference[]
    | undefined;

  if (!references) {
    return;
  }

  let configDirName = Path.dirname(configPath);

  let dependencies = references.map(reference =>
    normalize(Path.resolve(configDirName, reference.path)),
  );

  for (let dependencyConfigPath of dependencies) {
    configPathSet.add(dependencyConfigPath);

    resolve(dependencyConfigPath);
  }
}

function normalize(
  configPath: string,
  configFileName = 'tsconfig.json',
): string {
  let stat = FS.statSync(configPath);

  if (!stat) {
    throw new Error(`Invalid config path: "${configPath}"`);
  }

  if (stat.isDirectory()) {
    return Path.join(configPath, configFileName);
  } else {
    return configPath;
  }
}
