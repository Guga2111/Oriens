# Oriens Frontend

A modern, feature-rich task and project management web application built with React, TypeScript, and Tailwind CSS.

## Features

### = Authentication & Authorization
- **User Registration & Login**: Email-based account creation with JWT token authentication
- **Password Management**: Forgot password functionality with email-based token recovery and secure reset
- **User Roles**: Support for USER and ADMIN roles with role-based access control
- **Session Management**: Automatic token validation, expiration checking, and secure session cleanup
- **Protected Routes**: Role-based route protection for authenticated and admin-only pages

### =Ë Dashboard & Task Management
- **Task Creation**: Create tasks with title, description, due date, start time, priority levels (LOW/MEDIUM/HIGH), optional location, and status tracking
- **Task Organization**:
  - Day view with tasks grouped by time periods (Morning, Afternoon, Night)
  - Week view with calendar-based display
  - Filter tasks by date range
- **Task Operations**: Mark complete/incomplete, edit properties, delete with confirmation, update status without reload
- **Sound Notifications**: Audio feedback on task completion with toggle settings
- **Location Integration**: Google Maps integration for task locations with address autocomplete and map visualization

### =Ê Project Management
- **Project Creation**: Create projects with title, description, color assignment, and cover photo upload
- **Project Management**: Edit, archive, unarchive, delete, and favorite projects
- **Project Objectives**:
  - Add goals/objectives to projects with due dates
  - Track completion status of objectives
  - View pending and completed objectives in separate tabs
  - Sound notifications on objective completion
- **Progress Tracking**: Visual progress indicators and percentage displays
- **Project Browsing**: Infinite scroll pagination, project cards with progress bars, and visual project details page

### =d User Profile & Settings
- **Profile Management**: View and edit user profile with avatar/image upload capability
- **User Preferences**:
  - Theme selection (Light/Dark mode)
  - Notification toggle settings
  - Sound notification controls
  - Real-time preference persistence across sessions
- **Account Settings**: Account information display and account deletion with confirmation
- **Configuration Dashboard**: Centralized settings management with organized sections

### =È Statistics & Analytics
- **Dashboard KPIs**:
  - Monthly completed tasks count
  - Weekly productivity rate percentage
  - Active projects count
  - Overdue tasks count
  - Trend indicators for all metrics
- **Visual Charts**: Line charts for task completion trends over time using Recharts
- **Statistics Page**: Comprehensive metrics dashboard with responsive grid layout

### =h=¼ Admin Features
- **Support Ticket Management**:
  - View and manage all user support tickets
  - Filter tickets by status (OPEN, IN_PROGRESS, CLOSED)
  - Update ticket status workflow
  - Email contact functionality for responses
  - Dashboard statistics (total, open, in-progress, closed counts, average resolution time)
  - Priority indicators for tickets
- **User Management**:
  - View all registered users with email and creation dates
  - Display user statistics (total users, regular users, admin count)
  - Update user roles and convert users to/from admin status
  - Role-based menu visibility
- **Admin Dashboard**: Separate admin-only routes and widgets

### <˜ Support & Help Center
- **Help & Support Page**: Multi-tabbed interface with comprehensive help resources
- **FAQ System**: Searchable frequently asked questions with accordion-style display
- **Video Tutorials**: Tutorial cards with titles, descriptions, and YouTube video links
- **Documentation**: Quick links to guides, manuals, and full documentation
- **Support Ticket Submission**: Submit help requests with subject and message
- **Contact Information**: Display email and phone with copy-to-clipboard functionality

### <¨ User Interface & Experience
- **Notifications**: Toast notifications for success/error/info states with Sonner integration
- **Dialogs & Modals**: Confirmation dialogs, task/project creation/editing modals, settings dialogs
- **Navigation**:
  - Collapsible sidebar with main navigation and admin items
  - Sticky application header with branding and controls
  - Breadcrumb navigation on detail pages
  - Role-gated menu items
- **Visual Components**:
  - Status and priority badges
  - Progress bars for project completion
  - Dropdown menus for actions
  - Tabs for section organization
  - Collapsible content sections
- **Forms & Inputs**: Text inputs, textarea fields, select dropdowns, date/time pickers, checkboxes
- **Loading States**: Skeleton loaders, spinners, loading indicators, disabled form states
- **Empty States**: Contextual messaging for no data scenarios with helpful prompts
- **Responsive Design**: Mobile-optimized, tablet-friendly, and desktop layouts with breakpoint-based responsiveness
- **Accessibility**: Label associations, aria labels, semantic HTML, keyboard navigation support, focus management
- **Theme Support**: Light and dark theme with real-time switching and persistent storage

### =ú Location Features
- **Location Input**: Google Places API integration with address autocomplete and latitude/longitude capture
- **Location Display**: Task location badges, location info in task cards, map display dialogs with markers and info windows

### = Notification System
- **Bell Notifications**: Notification bell icon in header with notification count display
- **Sound Notifications**: Toggle for task and objective completion sounds
- **Notification Settings**: Preference management for notification and sound toggles

### <à Landing Page
- **Marketing Page**:
  - Hero section with call-to-action
  - Feature showcase with grid layout
  - Benefits display with icons
  - Feature cards highlighting daily planning, weekly view, reminders, and productivity dashboard
- **Social Integration**: Links to GitHub, LinkedIn, and email contact
- **Footer**: Company branding, product links, documentation, roadmap, and technology stack information

### =¾ Data Persistence & Synchronization
- **Local Storage**: Auth token persistence, user preferences caching, theme persistence, session state management
- **Backend Sync**: Real-time API integration with data refresh on navigation
- **Request Interceptors**: Authentication token handling and error management
- **Offline Awareness**: Graceful error handling for network issues

### = External Integrations
- **Google Maps API**: Places API for address autocomplete, maps embedding, marker placement, and info windows
- **WhatsApp Integration**: Mentioned feature for daily plan delivery and insights

### = Search & Filtering
- **FAQ Search**: Real-time search filtering with case-insensitive matching across questions and answers
- **Project Filtering**: Status filtering and infinite scroll pagination
- **Ticket Filtering**: Tab-based filtering by status (All, Open, In Progress, Closed)

### =Å Date & Time Features
- **Date Management**: Portuguese locale support (ptBR), date formatting, calendar picker, date range calculations
- **Time Management**: Time input for task scheduling, time formatting, time period categorization (Morning/Afternoon/Night)

###  Error Handling & Validation
- **Form Validation**: Password confirmation matching, required field validation, email format validation
- **Error States**: Network error messages, API error handling, token expiration handling
- **User Feedback**: Success/error notifications, form validation messages, 404 not found page

### =ã Routing & Navigation
- **Route Structure**: Public routes (home, auth, password reset, terms), protected routes (tasks, projects, stats, config, support), admin routes, and dynamic routes
- **Navigation Features**: Client-side routing with React Router, query parameters for filtering, dynamic URL parameters, route protection and redirects

### ¡ Performance Features
- **Data Fetching**: Infinite scroll pagination, lazy loading with intersection observer
- **Caching**: localStorage caching, component memoization, useCallback hooks, useMemo for computed values

### =à Technology Stack
- **Frontend Framework**: React 18.3 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API + TanStack React Query
- **Routing**: React Router 6.30
- **HTTP Client**: Axios with interceptors
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns with ptBR locale
- **Build Tool**: Vite with SWC
- **Code Quality**: ESLint
- **UI Components**: Radix UI primitives
- **Notifications**: Sonner toast library
- **Charts**: Recharts

## Project Structure

```
src/
   components/          # Reusable React components
      common/         # Common UI components (Header, Avatar, etc.)
      dashboard/      # Dashboard-specific components (TaskCard, Sidebar, etc.)
      projects/       # Project management components
      statistics/     # Statistics and analytics components
      settings/       # Settings and configuration components
      ui/             # Base UI components (Cards, Buttons, etc.)
   context/            # React Context providers
      AuthContext     # Authentication state
      SettingsContext # User preferences and settings
      ThemeContext    # Theme management
   hooks/              # Custom React hooks
      useAuth         # Authentication hook
      useSettings     # Settings hook
      useSound        # Sound notification hook
   pages/              # Page components
      DashboardPage   # Main dashboard
      ProjectsPage    # Projects management
      StatisticsPage  # Statistics dashboard
      SignLoginPage   # Authentication
      ResetPasswordPage
      HelpSupportPage
      AdminSupportPage
      AdminManagementPage
      LandingPage     # Marketing page
   services/           # API and utility services
      api.ts          # API client with Axios
      settingsService # Settings management
   router/             # Routing configuration
      ProtectedRoute  # Route protection component
   types/              # TypeScript type definitions
   App.tsx             # Main app component
   main.tsx            # App entry point
   index.css           # Global styles
```

## Key Statistics

- **13 Pages**: 1 landing, 1 auth, 11 protected pages
- **40+ Custom Components**: Modular, reusable component architecture
- **9 Main Routes**: Well-organized routing structure
- **3 Context Providers**: Auth, Settings, Theme
- **3 Custom Hooks**: useAuth, useSettings, useSound
- **19 Feature Categories**: Comprehensive feature set

## Getting Started

See the project's main README for installation and setup instructions.
