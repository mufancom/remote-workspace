import {
  RootRouteMatchType,
  Router as BoringRouter,
  schema,
} from 'boring-router';
import {BrowserHistory} from 'boring-router-react';

export const workspaceRouteSchema = schema({
  home: {
    $match: '',
  },
  create: {
    $query: {
      template: true,
      params: true,
      autoCreate: true,
    },
  },
  list: {
    $query: {
      search: true,
    },
  },
});

export type WorkspaceRoute = RootRouteMatchType<
  typeof workspaceRouteSchema,
  undefined,
  string
>;

const history = new BrowserHistory();
const router = new BoringRouter(history);

export const route = router.$route(workspaceRouteSchema);
