import { type RouteObject } from 'react-router-dom';
import MapEngine from '@/pages/MapEngine';
import MapBigDataDemo from '@/pages/MapBigDataDemo';
import Settings from '@/pages/Settings';
import EVRoutePlanner from '@/features/ev-route/page';
import EVCharging from '@/features/ev-charging/page';

const routes: RouteObject[] = [
  {
    path: '/',
    handle: {
      title: '地图引擎',
      label: '地图引擎',
    },
    element: <MapEngine />,
  },
  {
    path: '/bigdata',
    handle: {
      title: '海量POI',
      label: '海量POI',
    },
    element: <MapBigDataDemo />,
  },
  {
    path: '/ev-charging',
    handle: {
      title: 'EV续航与充电',
      label: 'EV续航与充电',
    },
    element: <EVCharging />,
  },
  {
    path: '/ev-route',
    handle: {
      title: '路径规划',
      label: '路径规划',
    },
    element: <EVRoutePlanner />,
  },
  {
    path: '/settings',
    handle: {
      title: '设置',
      label: '设置',
    },
    element: <Settings />,
  },
];

export default routes;
