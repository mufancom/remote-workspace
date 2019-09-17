import {RawWorkspaceProject, RawWorkspaceService} from './workspace';

export interface RawTemplateWorkspaceConfig {
  name: string;
  params?: string[];
  displayName?: string;
  projects?: (RawWorkspaceProject | string)[];
  services?: (RawWorkspaceService | string)[];
}

export interface RawTemplateProjectConfig extends RawWorkspaceProject {
  params?: string[];
}

export interface RawTemplateServiceConfig extends RawWorkspaceService {
  params?: string[];
}

export interface RawTemplatesConfig {
  workspaces?: RawTemplateWorkspaceConfig[];
  projects?: RawTemplateProjectConfig[];
  services?: RawTemplateServiceConfig[];
}
