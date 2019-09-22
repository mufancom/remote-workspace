import * as QueryString from 'querystring';

import _ from 'lodash';
import fetch from 'node-fetch';
import * as v from 'villa';

import {
  RawGitHubServiceConfig,
  RawGitLabServiceConfig,
  RawGitServiceConfig,
} from '../config';

const LIST_PULL_MERGE_REQUESTS_CACHE_TIMEOUT = 60 * 1000;

let listPullMergeRequestsCacheTimestamp = 0;
let listPullMergeRequestsCachePromise:
  | Promise<PullMergeRequestInfo[]>
  | undefined;

export interface PullMergeRequestInfo {
  url: string;
  host: string;
  project: string;
  id: string;
  sourceBranch: string;
  targetBranch: string;
  state: string;
}

export interface ProjectInfo {
  host: string;
  project: string;
  service: RawGitServiceConfig;
}

export async function listPullMergeRequests(
  infos: ProjectInfo[],
): Promise<PullMergeRequestInfo[]> {
  let now = Date.now();

  let promise = listPullMergeRequestsCachePromise;

  // Just ignores infos and returns the cache if not timed out.
  if (
    !listPullMergeRequestsCachePromise ||
    listPullMergeRequestsCacheTimestamp +
      LIST_PULL_MERGE_REQUESTS_CACHE_TIMEOUT <
      now
  ) {
    listPullMergeRequestsCacheTimestamp = now;

    listPullMergeRequestsCachePromise = v
      .map(
        infos,
        async ({
          host,
          project,
          service: serviceConfig,
        }): Promise<PullMergeRequestInfo[]> => {
          switch (serviceConfig.type) {
            case 'github':
              return listGitHubPullRequests(host, project, serviceConfig);
            case 'gitlab':
              return listGitLabMergeRequests(host, project, serviceConfig);
          }
        },
      )
      .then(_.flatten);
  }

  return promise || listPullMergeRequestsCachePromise;
}

async function listGitHubPullRequests(
  host: string,
  project: string,
  {credentials}: RawGitHubServiceConfig,
): Promise<PullMergeRequestInfo[]> {
  let url = `https://api.github.com/repos/${project}/pulls?state=all`;

  let response = await fetch(url, {
    headers: credentials
      ? {
          Authorization: `token ${credentials.accessToken}`,
        }
      : undefined,
  });

  let result = await response.json();

  if (!Array.isArray(result)) {
    console.error(
      `Result requesting GitHub project "${project}" pull requests is not an array:`,
    );
    console.error(result);

    return [];
  }

  return result.map(
    (entry): PullMergeRequestInfo => {
      return {
        url: entry.html_url,
        host,
        project,
        id: entry.number,
        state:
          entry.state === 'open'
            ? 'opened'
            : entry.merged_at
            ? 'merged'
            : 'closed',
        sourceBranch: entry.head.ref,
        targetBranch: entry.base.ref,
      };
    },
  );

  return [];
}

async function listGitLabMergeRequests(
  host: string,
  project: string,
  {url: baseURL = `https://${host}`, credentials}: RawGitLabServiceConfig,
): Promise<PullMergeRequestInfo[]> {
  let url = `${baseURL}/api/v4/projects/${encodeURIComponent(
    project,
  )}/merge_requests?state=all`;

  let response = await fetch(url, {
    headers: credentials
      ? {
          'Private-Token': credentials.accessToken,
        }
      : undefined,
  });

  let result = await response.json();

  if (!Array.isArray(result)) {
    console.error(
      `Result requesting GitLab "${baseURL}" project "${project}" merge requests is not an array:`,
    );
    console.error(result);

    return [];
  }

  return result.map(
    (entry): PullMergeRequestInfo => {
      return {
        url: entry.web_url,
        host,
        project,
        id: entry.iid,
        state: entry.state,
        sourceBranch: entry.source_branch,
        targetBranch: entry.target_branch,
      };
    },
  );
}

export interface CreatePullMergeRequestInfo {
  text: string;
  url: string;
}

export function generateCreatePullMergeRequestInfo(
  host: string,
  project: string,
  sourceBranch: string,
  targetBranch: string,
  serviceConfig: RawGitServiceConfig,
): CreatePullMergeRequestInfo {
  switch (serviceConfig.type) {
    case 'github':
      return {
        text: 'pull request',
        url: `https://github.com/${project}/compare/${targetBranch}...${sourceBranch}?expand=1`,
      };
    case 'gitlab': {
      let {url: baseURL = `https://${host}`} = serviceConfig;

      return {
        text: 'merge request',
        url: `${baseURL}/${project}/merge_requests/new?${QueryString.stringify({
          'merge_request[source_branch]': sourceBranch,
          'merge_request[target_branch]': targetBranch,
        })}`,
      };
    }
  }
}
