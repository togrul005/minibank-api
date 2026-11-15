import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { AccountsPage } from './pages/AccountsPage'
import { TransferPage } from './pages/TransferPage'
import { HistoryPage } from './pages/HistoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'transfer', element: <TransferPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
