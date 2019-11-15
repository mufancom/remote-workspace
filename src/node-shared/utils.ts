import * as FSE from 'fs-extra';
import stripJSONComments from 'strip-json-comments';

export async function gracefulReadJSONFile<T>(
  path: string,
): Promise<T | undefined> {
  let jsonc = await FSE.readFile(path, 'utf8').catch(() => undefined);

  let json = jsonc && stripJSONComments(jsonc);

  return json && JSON.parse(json);
}
