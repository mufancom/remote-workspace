import {OmitValueOfKey} from 'tslang';

import {
  RawWorkspace,
  RawWorkspaceProject,
  RawWorkspaceProjectGit,
} from './raw-workspace';

export interface WorkspaceMetadata extends RawWorkspace {
  port: number;
}

export interface WorkspaceStatus extends WorkspaceMetadata {
  ready: boolean;
}

export interface WorkspaceStatusPullMergeRequestInfo {
  text: string;
  url: string;
  state?: string;
}

export interface WorkspaceProjectGitWithPullMergeRequestInfo
  extends RawWorkspaceProjectGit {
  pullMergeRequest?: WorkspaceStatusPullMergeRequestInfo;
}

export interface WorkspaceProjectWithPullMergeRequestInfo
  extends RawWorkspaceProject {
  git: WorkspaceProjectGitWithPullMergeRequestInfo;
}

export interface WorkspaceStatusWithPullMergeRequestInfo
  extends WorkspaceStatus {
  projects: WorkspaceProjectWithPullMergeRequestInfo[];
}

export type CreateWorkspaceOptions = OmitValueOfKey<RawWorkspace, 'id'>;
