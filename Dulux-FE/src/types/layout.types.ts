export interface AppNavigationItem {
  label: string;
  path: string;
  headerTitle: string;
}

export type SidebarUserRole = 'admin' | 'cs' | 'quality';

export interface SidebarNavItem {
  icon: string;
  label: string;
  path: string;
  group: 'Main' | 'Warranty' | 'Support' | 'Admin';
  badgeCount?: number;
  allowedRoles: SidebarUserRole[];
}

export interface HeaderTitleMapItem {
  pathPrefix: string;
  title: string;
}
