import {Checkbox, PageHeader} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode, createRef} from 'react';

import {RawTemplatesConfig, WorkspaceMetadata} from '../../bld/shared';

import {WorkspaceForm, WorkspaceList} from './@components';

@observer
export class App extends Component {
  private workspaceListRef = createRef<WorkspaceList>();

  @observable
  private templates: RawTemplatesConfig = {};

  @observable
  private toShowAllWorkspaces = false;

  @observable
  private editingWorkspace: WorkspaceMetadata | undefined;

  @observable
  private formKey = 0;

  render(): ReactNode {
    let editingWorkspace = this.editingWorkspace;

    return (
      <div>
        <PageHeader
          title="Workspaces"
          extra={
            <>
              <Checkbox
                checked={this.toShowAllWorkspaces}
                onChange={this.onShowAllWorkspacesCheckboxChange}
              >
                show workspaces of other owners
              </Checkbox>
            </>
          }
        />
        <div className="section-content">
          <WorkspaceList
            editingWorkspace={editingWorkspace}
            ref={this.workspaceListRef}
            all={this.toShowAllWorkspaces}
            onEditClick={this.onWorkspaceListEditClick}
          />
        </div>
        <PageHeader
          title={editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}
          extra={
            editingWorkspace && (
              <a onClick={this.onCancelEditButtonClick}>cancel</a>
            )
          }
        />
        <div className="section-content">
          <WorkspaceForm
            key={this.formKey}
            templates={this.templates}
            workspace={editingWorkspace}
            onSubmitSuccess={this.onWorkspaceFormSubmitSuccess}
          />
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.loadTemplates().catch(console.error);
  }

  private onWorkspaceListEditClick = (workspace: WorkspaceMetadata): void => {
    this.editingWorkspace = workspace;
    this.formKey++;
  };

  private onCancelEditButtonClick = (): void => {
    this.editingWorkspace = undefined;
    this.formKey++;
  };

  private onWorkspaceFormSubmitSuccess = (): void => {
    this.workspaceListRef.current!.refresh();
    this.editingWorkspace = undefined;
    this.formKey++;
  };

  private onShowAllWorkspacesCheckboxChange = ({
    target,
  }: CheckboxChangeEvent): void => {
    this.toShowAllWorkspaces = target.checked;
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
