import {
  BriefcaseBusiness, ChartLine, Database, FolderOpenDot, Headset,
  Home, LifeBuoy, PiggyBank, Settings, Shield, type LucideIcon,
} from 'lucide-react';

type ContextNavItem = {
  label: string;
  icon: LucideIcon;
  url: string;
  prefixes?: string[];
};

type AppContext = {
  id: 'work' | 'financial' | 'statistics' | 'settings';
  label: string;
  railLabel: string;
  icon: LucideIcon;
  prefixes: string[];
  items: ContextNavItem[];
  adminItems?: ContextNavItem[];
};

export const appContexts: AppContext[] = [
  {
    id: 'work', label: 'Trabalho', railLabel: 'Trab.', icon: BriefcaseBusiness,
    prefixes: ['/tasks', '/projects', '/all-data'],
    items: [
      { label: 'Hoje', icon: Home, url: '/tasks' },
      { label: 'Projetos', icon: FolderOpenDot, url: '/projects', prefixes: ['/tasks/project'] },
      { label: 'Todos os dados', icon: Database, url: '/all-data' },
    ],
  },
  {
    id: 'financial', label: 'Financeiro', railLabel: 'Finan.', icon: PiggyBank, prefixes: ['/financial'],
    items: [{ label: 'Visão geral', icon: PiggyBank, url: '/financial' }],
  },
  {
    id: 'statistics', label: 'Estatísticas', railLabel: 'Estat.', icon: ChartLine, prefixes: ['/stats'],
    items: [{ label: 'Visão geral', icon: ChartLine, url: '/stats' }],
  },
  {
    id: 'settings', label: 'Configurações', railLabel: 'Config.', icon: Settings,
    prefixes: ['/config', '/support', '/admin'],
    items: [
      { label: 'Configurações', icon: Settings, url: '/config' },
      { label: 'Ajuda & Suporte', icon: LifeBuoy, url: '/support' },
    ],
    adminItems: [
      { label: 'Dashboard de Suporte', icon: Headset, url: '/admin/support' },
      { label: 'Gerenciar Admins', icon: Shield, url: '/admin/management' },
    ],
  },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getAppContext(pathname: string) {
  return appContexts.find(context => context.prefixes.some(prefix => matchesPrefix(pathname, prefix))) ?? appContexts[0];
}

export function isContextItemActive(item: ContextNavItem, pathname: string) {
  return pathname.replace(/\/$/, '') === item.url || item.prefixes?.some(prefix => matchesPrefix(pathname, prefix)) === true;
}
