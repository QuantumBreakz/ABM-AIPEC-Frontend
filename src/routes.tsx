import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth, RequireRole } from './auth/guards'
import { AppShell } from './components/layout/AppShell'
import { Root } from './components/layout/Root'
import DevGallery from './pages/DevGallery'
import LoginPage from './pages/LoginPage'
import {
  AdminProvidersPage,
  AdminSuppressionsPage,
  AdminUsersPage,
  AiReviewPage,
  CompaniesPage,
  CompanyDetailPage,
  ExportsPage,
  GapReportPage,
  NotFoundPage,
  OverviewPage,
  ReviewPage,
  RunDetailPage,
  RunsPage,
} from './pages/placeholders'

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <OverviewPage /> },
              { path: 'runs', element: <RunsPage /> },
              { path: 'runs/:id', element: <RunDetailPage /> },
              { path: 'companies', element: <CompaniesPage /> },
              { path: 'companies/:id/:tab?', element: <CompanyDetailPage /> },
              { path: 'review', element: <Navigate to="/review/website" replace /> },
              { path: 'review/:type', element: <ReviewPage /> },
              { path: 'ai/:companyId', element: <AiReviewPage /> },
              { path: 'exports', element: <ExportsPage /> },
              { path: 'admin/gap-report', element: <GapReportPage /> },
              {
                element: <RequireRole role="admin" />,
                children: [
                  { path: 'admin/users', element: <AdminUsersPage /> },
                  { path: 'admin/providers', element: <AdminProvidersPage /> },
                  { path: 'admin/suppressions', element: <AdminSuppressionsPage /> },
                ],
              },
              // Component gallery: development builds only
              ...(import.meta.env.DEV ? [{ path: 'dev/ui', element: <DevGallery /> }] : []),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
