import {Button, Checkbox, Descriptions, Form, Input, Radio} from 'antd';
import {CheckboxOptionType} from 'antd/lib/checkbox';
import {RadioChangeEvent} from 'antd/lib/radio';
import _ from 'lodash';
import {computed, observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {ChangeEvent, Component, ReactNode} from 'react';
import {Dict} from 'tslang';

import {
  CreateWorkspaceOptions,
  RawTemplateProjectConfig,
  RawTemplateServiceConfig,
  RawTemplateWorkspaceConfig,
  RawTemplatesConfig,
} from '../../server-client';

export interface CreateWorkspaceFormProps {}

@observer
export class CreateWorkspaceForm extends Component<CreateWorkspaceFormProps> {
  @observable
  private templates: RawTemplatesConfig = {};

  @observable
  private selectedWorkspaceName: string | false = false;

  @observable
  private _selectedProjectNames: string[] = [];

  @observable
  private _selectedServiceNames: string[] = [];

  @observable
  private paramsDict: Dict<string | undefined> = {};

  @observable
  private _optionsJSON: string | undefined;

  @computed
  private get displayName(): string {}

  @computed
  private get selectedWorkspaceTemplate():
    | RawTemplateWorkspaceConfig
    | undefined {
    let {workspaces} = this.templates;
    let selectedWorkspaceName = this.selectedWorkspaceName;

    return workspaces && selectedWorkspaceName
      ? workspaces.find(workspace => workspace.name === selectedWorkspaceName)!
      : undefined;
  }

  @computed
  private get selectedProjectTemplates(): RawTemplateProjectConfig[] {
    let {projects = []} = this.templates;
    let selectedProjectNameSet = new Set(this.selectedProjectNames);

    return projects.filter(project => selectedProjectNameSet.has(project.name));
  }

  @computed
  private get selectedProjectNames(): string[] {
    return _.union(this.requiredProjectNames, this._selectedProjectNames);
  }

  @computed
  private get requiredProjectNames(): string[] {
    let workspaceName = this.selectedWorkspaceName;
    let {workspaces} = this.templates;

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
    let {services = []} = this.templates;
    let selectedServiceNameSet = new Set(this.selectedServiceNames);

    return services.filter(service => selectedServiceNameSet.has(service.name));
  }

  @computed
  private get selectedServiceNames(): string[] {
    return _.union(this.requiredServiceNames, this._selectedServiceNames);
  }

  @computed
  private get requiredServiceNames(): string[] {
    let workspaceName = this.selectedWorkspaceName;
    let {workspaces} = this.templates;

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
  private get optionsJSON(): string {
    if (this._optionsJSON) {
      return this._optionsJSON;
    }

    let selectedWorkspaceName = this.selectedWorkspaceName;

    let {workspaces} = this.templates;

    let workspaceTemplate = this.selectedWorkspaceTemplate || {
      name: '',
    };

    let workspace: CreateWorkspaceOptions = {
      // displayName,
    };

    return JSON.stringify({});
  }

  @computed
  private get workspaceTemplatesRendering(): ReactNode {
    let {workspaces} = this.templates;

    if (!workspaces) {
      return undefined;
    }

    let options: (CheckboxOptionType | string)[] = [
      {
        label: 'none',
        value: false,
      },
      ...workspaces.map(workspace => workspace.name),
    ];

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
    let {projects} = this.templates;

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
    let {services} = this.templates;

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
    let params = _.union(
      ...[
        this.selectedWorkspaceTemplate,
        ...this.selectedProjectTemplates,
        ...this.selectedServiceTemplates,
      ].map(template => template && template.params),
    );

    if (!params.length) {
      return undefined;
    }

    let paramDict = this.paramsDict;

    return params.map(param => (
      <Descriptions.Item key={`param:${param}`} label={param}>
        <Input value={paramDict[param]} disabled={!!this._optionsJSON} />
      </Descriptions.Item>
    ));
  }

  @computed
  private get optionsJSONRendering(): ReactNode {
    return (
      <Descriptions.Item label="Options">
        <Input.TextArea
          autosize
          value={this.optionsJSON}
          onChange={this.onOptionsJSONInputChange}
        />
        <div className="buttons-line">
          <Button type="link" onClick={this.onResetOptionsJSONButtonClick}>
            Reset
          </Button>
          <Button type="primary">Create</Button>
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
    this.load().catch(console.error);
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

  private onResetOptionsJSONButtonClick = (): void => {
    this._optionsJSON = undefined;
  };

  private async load(): Promise<void> {
    let response = await fetch('/api/templates');
    let {data} = (await response.json()) as {
      data?: RawTemplatesConfig;
    };

    if (data) {
      this.templates = data;
    }
  }
}
