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
