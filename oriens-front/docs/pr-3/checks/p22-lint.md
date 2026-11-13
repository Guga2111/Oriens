```text

> vite_react_shadcn_ts@0.0.0 lint
> eslint .


/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/dashboard/LocationMap.tsx
  51:9  warning  The 'taskLocation' object makes the dependencies of useCallback Hook (at line 70) change on every render. To fix this, wrap the initialization of 'taskLocation' in its own useMemo() Hook  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/dashboard/NotificationBell.tsx
  41:6  warning  React Hook useEffect has a missing dependency: 'fetchNotifications'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/financial/RecurringManagementDialog.tsx
  55:6  warning  React Hook useEffect has a missing dependency: 'loadRecurringEntries'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/financial/TagManagementDialog.tsx
  67:6  warning  React Hook useEffect has a missing dependency: 'loadTags'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/layout/AppLayout.tsx
  21:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/badge.tsx
  34:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/button.tsx
  47:18  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/form.tsx
  129:10  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/navigation-menu.tsx
  111:3  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/sidebar.tsx
  644:3  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/sonner.tsx
  28:19  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/components/ui/toggle.tsx
  37:18  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/context/AuthContext.tsx
  134:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/context/SettingsContext.tsx
  174:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/context/ThemeContext.tsx
  38:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/pages/AdminSupportPage.tsx
  74:6  warning  React Hook useEffect has a missing dependency: 'filterTickets'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/pages/ProjectDetailPage.tsx
  140:6  warning  React Hook useEffect has a missing dependency: 'fetchProject'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/private/tmp/oriens-pr3/history/2a1299b/oriens-front/src/pages/ProjectsPage.tsx
   98:6  warning  React Hook useEffect has a missing dependency: 'refreshProjects'. Either include it or remove the dependency array             react-hooks/exhaustive-deps
  104:6  warning  React Hook useEffect has missing dependencies: 'fetchProjects' and 'page'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

✖ 19 problems (0 errors, 19 warnings)


```
