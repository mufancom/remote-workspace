import {RawWorkspaceProject, RawWorkspaceService} from './raw-workspace';

/**
 * Workspace templates configuration.
 *
 * Those templates will eventually be converted `RawWorkspace`:
 * https://github.com/makeflow/remote-workspace/blob/master/src/shared/types/raw-workspace.ts
 */
export interface RawTemplatesConfig {
  /**
   * Workspace templates.
   */
  workspaces?: RawTemplateWorkspaceConfig[];
  /**
   * Project templates.
   */
  projects?: RawTemplateProjectConfig[];
  /**
   * Service templates.
   */
  services?: RawTemplateServiceConfig[];
}

export interface RawTemplateWorkspaceConfig {
  /**
   * Name of the workspace template, displayed in "create workspace" form.
   */
  name: string;
  /**
   * Declare parameters used in this template.
   */
  params?: string[];
  /**
   * Display name of the workspace to be created, an example is value
   * `${branch}` with parameter `branch` declared above.
   */
  displayName?: string;
  /**
   * Specify the image of this workspace.
   */
  image?: string;
  /**
   * Inline project options or string references the defined project templates.
   */
  projects?: (RawWorkspaceProject | string)[];
  /**
   * Inline service options or string references the defined service templates.
   */
  services?: (RawWorkspaceService | string)[];
}

export interface RawTemplateProjectConfig extends RawWorkspaceProject {
  /**
   * Declare parameters used in this template.
   */
  params?: string[];
}

export interface RawTemplateServiceConfig extends RawWorkspaceService {
  /**
   * Declare parameters used in this template.
   */
  params?: string[];
}
