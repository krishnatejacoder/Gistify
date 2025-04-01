import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import Layout from './Layout.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import GistIt from './components/gistit/GistIt.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [{path: '', element: <Dashboard />}]
  },
  {
    path: '/gistit',
    element: <Layout />,
    children: [{path: '', element: <GistIt />}]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
