import type { Icon } from '@phosphor-icons/react';
import { ChartDonutIcon } from '@phosphor-icons/react/dist/csr/ChartDonut';
import { ReadCvLogoIcon } from '@phosphor-icons/react/dist/csr/ReadCvLogo';
import { TipJarIcon } from '@phosphor-icons/react/dist/csr/TipJar';
import {
  Briefcase, CalendarCheck, ChartLine, Headset,
  House, LifeBuoy, PiggyBank, ReceiptText, Settings, Shield, Telescope, type LucideIcon,
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
  icon: Icon | LucideIcon;
  prefixes: string[];
  items: ContextNavItem[];
  adminItems?: ContextNavItem[];
};

export const appContexts: AppContext[] = [
  {
    id: 'work', label: 'Trabalho', railLabel: 'Trabalho', icon: ReadCvLogoIcon,
    prefixes: ['/home', '/tasks', '/projects', '/all-data'],
    items: [
      { label: 'Início', icon: House, url: '/home' },
      { label: 'Hoje', icon: CalendarCheck, url: '/tasks' },
      { label: 'Projetos', icon: Briefcase, url: '/projects', prefixes: ['/tasks/project'] },
      { label: 'Explorar', icon: Telescope, url: '/all-data' },
    ],
  },
  {
    id: 'financial', label: 'Financeiro', railLabel: 'Finanças', icon: TipJarIcon, prefixes: ['/financial'],
    items: [
      { label: 'Visão geral', icon: PiggyBank, url: '/financial' },
      { label: 'Lançamentos', icon: ReceiptText, url: '/financial/entries' },
    ],
  },
  {
    id: 'statistics', label: 'Estatísticas', railLabel: 'Métricas', icon: ChartDonutIcon, prefixes: ['/stats'],
    items: [{ label: 'Visão geral', icon: ChartLine, url: '/stats' }],
  },
  {
    id: 'settings', label: 'Configurações', railLabel: 'Ajustes', icon: Settings,
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

/** The navigation item for the current page, across every context, so the header can show its icon. */
export function getContextItem(pathname: string) {
  return appContexts
    .flatMap(context => [...context.items, ...(context.adminItems ?? [])])
    .find(item => isContextItemActive(item, pathname));
}
