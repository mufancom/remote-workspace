import {PageHeader} from 'antd';
import {RouteComponentProps} from 'boring-router-react';
import {computed, observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode, createRef} from 'react';
import {Dict} from 'tslang';

import {RawTemplatesConfig} from '../../../bld/shared';
import {VersionInfo, WorkspaceForm, WorkspaceList} from '../@components';
import {WorkspaceRoute} from '../@routes';

export interface CreateViewProps
  extends RouteComponentProps<WorkspaceRoute['create']> {
  className?: string;
}

@observer
export class CreateView extends Component<CreateViewProps> {
  private workspaceListRef = createRef<WorkspaceList>();

  @observable
  private templates: RawTemplatesConfig = {};

  @observable
  private formKey = 0;

  @computed
  private get defaultWorkspaceName(): string | undefined {
    let {match} = this.props;
    return match.$params.template;
  }

  @computed
  private get defaultParams(): Dict<string> | undefined {
    let {match} = this.props;

    let paramsString = match.$params.params;

    if (!paramsString) {
      return undefined;
    }

    return paramsString.split('&').reduce<Dict<string>>((dict, param) => {
      let [key, val] = param.split('=');

      dict[key] = val;

      return dict;
    }, {});
  }

  @computed
  private get autoCreate(): boolean {
    let {match} = this.props;
    return !!match.$params.autoCreate;
  }

  render(): ReactNode {
    let autoCreate = this.autoCreate;
    let defaultParams = this.defaultParams;
    let defaultWorkspaceName = this.defaultWorkspaceName;

    return (
      <div>
        <VersionInfo />
        <PageHeader title="Create Workspace" />
        <div className="section-content">
          <WorkspaceForm
            key={this.formKey}
            templates={this.templates}
            workspace={undefined}
            autoCreate={autoCreate}
            defaultParams={defaultParams}
            defaultWorkspaceName={defaultWorkspaceName}
            onSubmitSuccess={this.onWorkspaceFormSubmitSuccess}
          />
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.loadTemplates().catch(console.error);
  }

  private onWorkspaceFormSubmitSuccess = (): void => {
    this.workspaceListRef.current!.refresh();
    this.formKey++;
  };

  private async loadTemplates(): Promise<void> {
    let response = await fetch('/api/templates');
    let {data} = (await response.json()) as {
      data?: RawTemplatesConfig;
    };

    if (data) {
      this.templates = data;
    }
  }
}
