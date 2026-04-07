export interface AppNavigationItem {
  label: string;
  path: string;
  headerTitle: string;
}

export interface SidebarNavItem {
  icon: string;
  label: string;
  path: string;
  group: 'Main' | 'Warranty' | 'Support' | 'Admin';
  badgeCount?: number;
}

export interface HeaderTitleMapItem {
  pathPrefix: string;
  title: string;
}
