import {OmitValueOfKey} from 'tslang';

export interface RawWorkspaceProjectGit {
  url: string;
  branch?: string;
  newBranch?: string;
}

export interface RawWorkspaceProjectScripts {
  initialize?: string;
}

export interface RawWorkspaceProjectSSH {
  configs?: string[];
}

export interface RawWorkspaceProject {
  name: string;
  git: RawWorkspaceProjectGit;
  scripts?: RawWorkspaceProjectScripts;
  ssh?: RawWorkspaceProjectSSH;
}

export interface RawWorkspaceService {
  name: string;
  image: string;
}

export interface RawWorkspace {
  id: string;
  displayName: string;
  image?: string;
  projects: RawWorkspaceProject[];
  services?: RawWorkspaceService[];
}

export interface WorkspaceMetadata extends RawWorkspace {
  port: number;
}

export interface WorkspaceStatus extends WorkspaceMetadata {
  ready: boolean;
}

export type CreateWorkspaceOptions = OmitValueOfKey<RawWorkspace, 'id'>;
