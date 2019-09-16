import {OmitValueOfKey} from 'tslang';

export interface RawWorkspaceProject {
  name: string;
  repository: string;
  branch: string;
  initialize: string;
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

export type CreateWorkspaceOptions = OmitValueOfKey<RawWorkspace, 'id'>;
