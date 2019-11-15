import * as FS from 'fs';
import * as Path from 'path';

import Glob from 'glob';
import {format} from 'prettier';
import stripJsonComments from 'strip-json-comments';

// tslint:disable-next-line: no-var-requires no-require-imports
const PRETTIER_CONFIG = require('../prettier.config');

const TSCONFIG_FILE_NAME = 'tsconfig.json';
const COMPOSITE_TSCONFIG_FILE_NAME = 'tsconfig.json';

const CONFIG_EXTENSION_TO_COMPILER_OPTIONS_DICT = {
  incremental: {
    noUnusedLocals: false,
    noUnusedParameters: false,
  },
};

interface TSConfig {
  extends?: string;
  compilerOptions?: object;
  references?: {path: string}[];
}

const tsConfigPaths = Glob.sync(`**/${TSCONFIG_FILE_NAME}`, {
  ignore: '**/node_modules/**',
});

for (let tsConfigPath of tsConfigPaths) {
  let dirName = Path.dirname(tsConfigPath);

  let compositeTSConfigPath = Path.join(dirName, COMPOSITE_TSCONFIG_FILE_NAME);

  let compositeTSConfigJSONC = FS.readFileSync(compositeTSConfigPath, 'utf8');

  let compositeTSConfig = JSON.parse(
    stripJsonComments(compositeTSConfigJSONC),
  ) as TSConfig;

  let {references = []} = compositeTSConfig;

  let beingReferencesConfig =
    !compositeTSConfig.extends && !compositeTSConfig.compilerOptions;

  for (let reference of references) {
    let path = Path.join(dirName, reference.path);
    let stats = FS.statSync(path);

    if (stats && stats.isDirectory()) {
      reference.path = Path.join(reference.path, TSCONFIG_FILE_NAME);
      path = Path.join(dirName, reference.path);
      stats = FS.statSync(path);
    }

    if (!stats || !stats.isFile()) {
      throw new Error(
        `Reference "${reference.path}" in "${compositeTSConfigPath}" does not exist`,
      );
    }
  }

  for (let [extension, compilerOptions] of Object.entries(
    CONFIG_EXTENSION_TO_COMPILER_OPTIONS_DICT,
  )) {
    let extendedTSConfigPath = Path.join(dirName, `tsconfig.${extension}.json`);

    if (!FS.existsSync(extendedTSConfigPath)) {
      continue;
    }

    let extendedTSConfigReferences = references
      .map(({path: relativePath, ...rest}) => {
        return {
          path: Path.join(
            relativePath,
            `../tsconfig.${extension}.json`,
          ).replace(/\\/g, '/'),
          ...rest,
        };
      })
      .filter(({path: relativePath}) =>
        FS.existsSync(Path.join(dirName, relativePath)),
      );

    let extendedTSConfig = beingReferencesConfig
      ? {
          references: extendedTSConfigReferences,
          files: [],
        }
      : {
          extends: `./${COMPOSITE_TSCONFIG_FILE_NAME}`,
          compilerOptions,
          references: extendedTSConfigReferences.length
            ? extendedTSConfigReferences
            : undefined,
        };

    updateTSConfigFile(extendedTSConfigPath, extendedTSConfig);
  }
}

function updateTSConfigFile(path: string, config: TSConfig): void {
  let json = format(JSON.stringify(config), {
    parser: 'json',
    ...PRETTIER_CONFIG,
  });

  let originalJSON = FS.existsSync(path)
    ? FS.readFileSync(path, 'utf8')
    : undefined;

  if (json !== originalJSON) {
    FS.writeFileSync(path, json);
    console.info(`Updated "${path}".`);
  }
}
