import {RouteComponentProps} from 'boring-router-react';
import {computed} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {WorkspaceFilter, WorkspaceList} from '../@components';
import {WorkspaceRoute} from '../@routes';

export interface LaunchViewProps
  extends RouteComponentProps<WorkspaceRoute['launch']> {
  className?: string;
}

@observer
export class LaunchView extends Component<LaunchViewProps> {
  @computed
  private get searchText(): string {
    let {match} = this.props;
    return match.$params.search || '';
  }

  @computed
  private get workspaceFilter(): WorkspaceFilter {
    return workspace => workspace.displayName.includes(this.searchText);
  }

  render(): ReactNode {
    return (
      <WorkspaceList
        all={true}
        editingWorkspace={undefined}
        filter={this.workspaceFilter}
      />
    );
  }
}
