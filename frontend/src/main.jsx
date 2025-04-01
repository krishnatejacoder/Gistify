import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import Layout from './Layout.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import GistIt_Chatbot from './components/gistit/GistIt_Chatbot.jsx';
import GistIt from './components/gistit/GistIt.jsx';
import GistIt_Uploaded from './components/gistit/GistIt_Uploaded.jsx';

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
  },
  {
    path: '/gistit_uploaded',
    element: <Layout />,
    children: [{path: '', element: <GistIt_Uploaded />}]
  },
  {
    path: '/chatbot',
    element: <Layout />,
    children: [{path: '', element: <GistIt_Chatbot />}]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
