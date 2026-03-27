import { lazy } from 'react';

export type PageType = 'default' | 'utility';

export interface PageConfig {
  path: string;
  slug: string;
  type: PageType;
  seo: {
    title: string;
    description: string;
    noindex?: boolean;
  };
  component: ReturnType<typeof lazy>;
}

/**
 * Utilitary pages registered in the app router.
 * `/admin` remains untouched in its original route declaration.
 */
export const utilityPages: PageConfig[] = [
  {
    path: '/dashboard',
    slug: 'dashboard',
    type: 'utility',
    seo: {
      title: 'Dashboard',
      description: '',
      noindex: true,
    },
    component: lazy(() => import('@/pages/Dashboard')),
  },
];
