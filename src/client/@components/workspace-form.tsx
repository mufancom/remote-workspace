import {Button, Checkbox, Descriptions, Input, Radio, message} from 'antd';
import {CheckboxOptionType} from 'antd/lib/checkbox';
import {RadioChangeEvent} from 'antd/lib/radio';
import _ from 'lodash';
import {autorun, computed, observable, runInAction} from 'mobx';
import {disposeOnUnmount, observer} from 'mobx-react';
import React, {ChangeEvent, Component, ReactNode} from 'react';
import {Dict, OmitValueOfKey} from 'tslang';

import {
  CreateWorkspaceOptions,
  RawTemplateProjectConfig,
  RawTemplateServiceConfig,
  RawTemplateWorkspaceConfig,
  RawTemplatesConfig,
  RawWorkspace,
  RawWorkspaceProject,
  WorkspaceMetadata,
} from '../../../bld/shared';

export interface WorkspaceFormProps {
  templates: RawTemplatesConfig;
  workspace: WorkspaceMetadata | undefined;
  defaultWorkspaceName?: string;
  defaultParams?: Dict<string>;
  autoCreate?: boolean;
  onSubmitSuccess(): void;
}

const AUTO_CREATE_DELAY_TIME = 200;

@observer
export class WorkspaceForm extends Component<WorkspaceFormProps> {
  @observable
  private selectedWorkspaceName = 'default';

  @observable
  private _selectedProjectNames: string[] = [];

  @observable
  private _selectedServiceNames: string[] = [];

  @observable
  private _paramDict: Dict<string | undefined> | undefined;

  @observable
  private _optionsJSON: string | undefined;

  @observable
  private processing = false;

  constructor(props: WorkspaceFormProps) {
    super(props);

    let {workspace} = props;

    if (workspace) {
      let {displayName, owner, image, projects, services} = workspace;

      let options: OmitValueOfKey<RawWorkspace, 'id' | 'params'> = {
        displayName,
        owner,
        image,
        projects: projects.map(
          ({
            name,
            git: {url, branch, newBranch},
            scripts,
            ssh,
          }): RawWorkspaceProject => {
            return {
              name,
              git: {
                url,
                branch,
                newBranch,
              },
              scripts,
              ssh,
            };
          },
        ),
        services,
      };

      this._optionsJSON = JSON.stringify(options, undefined, 2);
    }
  }

  @computed
  private get paramKeys(): string[] {
    return _.union(
      ...[
        this.selectedWorkspaceTemplate,
        ...this.selectedProjectTemplates,
        ...this.selectedServiceTemplates,
      ].map(template => template && template.params),
    );
  }

  @computed
  private get paramDict(): Dict<string | undefined> {
    let {workspace} = this.props;

    return this._paramDict || (workspace && workspace.params) || {};
  }

  @computed
  private get prunedParamDict(): Dict<string> {
    let paramDict = this.paramDict;

    return _.fromPairs(
      this.paramKeys
        .map(key => [key, paramDict[key]])
        .filter((entry): entry is [string, string] => !!entry[1]),
    );
  }

  @computed
  private get selectedWorkspaceTemplate():
    | RawTemplateWorkspaceConfig
    | undefined {
    let {
      templates: {workspaces},
    } = this.props;

    let selectedWorkspaceName = this.selectedWorkspaceName;

    return workspaces && selectedWorkspaceName
      ? workspaces.find(workspace => workspace.name === selectedWorkspaceName)!
      : undefined;
  }

  @computed
  private get selectedProjectTemplates(): RawTemplateProjectConfig[] {
    let {
      templates: {projects = []},
    } = this.props;

    let selectedProjectNameSet = new Set(this.selectedProjectNames);

    return projects.filter(project => selectedProjectNameSet.has(project.name));
  }

  @computed
  private get selectedProjectNames(): string[] {
    return _.union(this.requiredProjectNames, this._selectedProjectNames);
  }

  @computed
  private get requiredProjectNames(): string[] {
    let {
      templates: {workspaces},
    } = this.props;

    let workspaceName = this.selectedWorkspaceName;

    if (!workspaceName || !workspaces) {
      return [];
    }

    let {projects = []} = workspaces.find(
      workspace => workspace.name === workspaceName,
    )!;

    return projects.filter(
      (project): project is string => typeof project === 'string',
    );
  }

  @computed
  private get selectedServiceTemplates(): RawTemplateServiceConfig[] {
    let {
      templates: {services = []},
    } = this.props;

    let selectedServiceNameSet = new Set(this.selectedServiceNames);

    return services.filter(service => selectedServiceNameSet.has(service.name));
  }

  @computed
  private get selectedServiceNames(): string[] {
    return _.union(this.requiredServiceNames, this._selectedServiceNames);
  }

  @computed
  private get requiredServiceNames(): string[] {
    let {
      templates: {workspaces},
    } = this.props;

    let workspaceName = this.selectedWorkspaceName;

    if (!workspaceName || !workspaces) {
      return [];
    }

    let {services = []} = workspaces.find(
      workspace => workspace.name === workspaceName,
    )!;

    return services.filter(
      (service): service is string => typeof service === 'string',
    );
  }

  @computed
  private get missingParams(): boolean {
    if (this._optionsJSON) {
      return false;
    }

    let presentParamKeySet = new Set(Object.keys(this.prunedParamDict));

    return this.paramKeys.some(key => !presentParamKeySet.has(key));
  }

  @computed
  private get optionsJSON(): string {
    if (this._optionsJSON) {
      return this._optionsJSON;
    }

    let paramDict = this.paramDict;

    let {displayName = ''} = this.selectedWorkspaceTemplate || {
      name: '',
    };

    let options: CreateWorkspaceOptions = {
      displayName,
      owner: localStorage.email,
      projects: this.selectedProjectTemplates.map(({params, ...rest}) => rest),
      services: this.selectedServiceTemplates.map(({params, ...rest}) => rest),
    };

    options = _.cloneDeepWith(options, value => {
      return typeof value === 'string' ? replaceParams(value) : undefined;
    });

    return JSON.stringify(options, undefined, 2);

    function replaceParams(content: string): string {
      return content.replace(
        /\$\{(\w+)\}/g,
        (text, key) => paramDict[key] || text,
      );
    }
  }

  @computed
  private get workspaceTemplatesRendering(): ReactNode {
    let {
      templates: {workspaces},
    } = this.props;

    if (!workspaces) {
      return undefined;
    }

    let options = workspaces.map(workspace => workspace.name);

    if (!options.some(option => option === 'default')) {
      options.unshift('default');
    }

    return (
      <Descriptions.Item label="Workspace Templates">
        <Radio.Group
          options={options}
          disabled={!!this._optionsJSON}
          value={this.selectedWorkspaceName}
          onChange={this.onWorkspaceRadioChange}
        ></Radio.Group>
      </Descriptions.Item>
    );
  }

  @computed
  private get projectTemplatesRendering(): ReactNode {
    let {
      templates: {projects},
    } = this.props;

    if (!projects) {
      return undefined;
    }

    let requiredProjects = this.requiredProjectNames;
    let requiredProjectSet = new Set(requiredProjects);

    return (
      <Descriptions.Item label="Project Templates">
        <Checkbox.Group
          options={projects.map(
            ({name}): CheckboxOptionType => {
              return {
                label: name,
                value: name,
                disabled: requiredProjectSet.has(name),
              };
            },
          )}
          disabled={!!this._optionsJSON}
          value={this.selectedProjectNames}
          onChange={this.onProjectCheckboxChange}
        />
      </Descriptions.Item>
    );
  }

  @computed
  private get serviceTemplatesRendering(): ReactNode {
    let {
      templates: {services},
    } = this.props;

    if (!services) {
      return undefined;
    }

    let requiredServices = this.requiredServiceNames;
    let requiredServiceSet = new Set(requiredServices);

    return (
      <Descriptions.Item label="Service Templates">
        <Checkbox.Group
          options={services.map(
            ({name}): CheckboxOptionType => {
              return {
                label: name,
                value: name,
                disabled: requiredServiceSet.has(name),
              };
            },
          )}
          disabled={!!this._optionsJSON}
          value={this.selectedServiceNames}
          onChange={this.onServiceCheckboxChange}
        />
      </Descriptions.Item>
    );
  }

  @computed
  private get paramsRendering(): ReactNode {
    let paramKeys = this.paramKeys;

    if (!paramKeys.length) {
      return undefined;
    }

    let paramDict = this.paramDict;

    return paramKeys.map(paramKey => (
      <Descriptions.Item
        key={`param:${paramKey}`}
        label={`Parameter \${${paramKey}}`}
      >
        <Input
          value={paramDict[paramKey]}
          disabled={!!this._optionsJSON}
          onChange={event => this.setParam(paramKey, event.target.value)}
        />
      </Descriptions.Item>
    ));
  }

  @computed
  private get optionsJSONRendering(): ReactNode {
    let {workspace} = this.props;

    return (
      <Descriptions.Item label="Options">
        <Input.TextArea
          autosize
          value={this.optionsJSON}
          onChange={this.onOptionsJSONInputChange}
        />
        <div className="buttons-line">
          {this._optionsJSON && (
            <Button type="link" onClick={this.onResetButtonClick}>
              Reset
            </Button>
          )}
          <Button
            type="primary"
            disabled={this.missingParams}
            loading={this.processing}
            onClick={this.onSubmitButtonClick}
          >
            {workspace ? 'Update' : 'Create'}
          </Button>
        </div>
      </Descriptions.Item>
    );
  }

  render(): ReactNode {
    return (
      <Descriptions bordered column={1}>
        {this.workspaceTemplatesRendering}
        {this.projectTemplatesRendering}
        {this.serviceTemplatesRendering}
        {this.paramsRendering}
        {this.optionsJSONRendering}
      </Descriptions>
    );
  }

  componentDidMount(): void {
    this.initialize();

    setTimeout(() => {
      if (this.props.autoCreate) {
        this.onSubmitButtonClick();
      }
    }, AUTO_CREATE_DELAY_TIME);
  }

  private onWorkspaceRadioChange = (event: RadioChangeEvent): void => {
    this.selectedWorkspaceName = event.target.value || false;
  };

  private onProjectCheckboxChange = (projects: string[]): void => {
    this._selectedProjectNames = projects;
  };

  private onServiceCheckboxChange = (services: string[]): void => {
    this._selectedServiceNames = services;
  };

  private onOptionsJSONInputChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    this._optionsJSON = event.target.value || undefined;
  };

  private onResetButtonClick = (): void => {
    this._optionsJSON = undefined;
  };

  private onSubmitButtonClick = (): void => {
    this.submit(this.optionsJSON).catch(console.error);
  };

  private initialize(): void {
    disposeOnUnmount(
      this,
      autorun(() => {
        let {
          templates: {workspaces},
          defaultWorkspaceName,
          defaultParams,
        } = this.props;

        runInAction((): void => {
          if (
            defaultWorkspaceName &&
            workspaces &&
            workspaces.some(({name}) => name === defaultWorkspaceName)
          ) {
            this.selectedWorkspaceName = defaultWorkspaceName;
          }

          if (!defaultParams) {
            return;
          }

          let paramKeysSet = new Set(this.paramKeys);

          for (let paramKey in defaultParams) {
            if (!paramKeysSet.has(paramKey)) {
              continue;
            }

            this.setParam(paramKey, defaultParams[paramKey]);
          }
        });
      }),
    );
  }

  private setParam(key: string, value: string): void {
    this._paramDict = {
      ...this.paramDict,
      [key]: value,
    };
  }

  private async submit(json: string): Promise<void> {
    let {workspace, onSubmitSuccess} = this.props;

    let data = JSON.parse(json);

    let paramDict = this.prunedParamDict;

    let url: string;
    let method: string;

    if (workspace) {
      let {id, port} = workspace;

      url = `/api/workspaces/${id}`;
      method = 'PUT';

      json = JSON.stringify({
        id,
        ...data,
        params: paramDict,
        port,
      });
    } else {
      url = '/api/workspaces';
      method = 'POST';

      json = JSON.stringify({
        ...data,
        params: paramDict,
      });
    }

    this.processing = true;

    try {
      let response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json,
      });

      let {error} = await response.json();

      if (error) {
        message.error(error);
      } else {
        message.success('Workspace created.');

        onSubmitSuccess();
      }
    } finally {
      this.processing = false;
    }
  }
}
