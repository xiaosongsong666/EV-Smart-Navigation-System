import { type RouteObject } from 'react-router-dom';
import Mapliber from '@/pages/mapliberModel';
import MapBigDataDemo from '@/pages/MapBigDataDemo';
import Settings from '@/pages/Settings';
import EVRoutePlanner from '@/features/ev-route/page';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Mapliber />,
  },
  {
    path: '/bigdata',
    element: <MapBigDataDemo />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/ev-route',
    element: <EVRoutePlanner />,
  },
];

export default routes;
