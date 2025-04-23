import { useLocation } from 'react-router-dom';
import './MainLayout.css';

export default function MainLayout({children}) {
  const notNavItems = ['/login', '/signup'];
  const location = useLocation();
  const layoutClass = notNavItems.includes(location.pathname) ? 'no-nav' : 'with-nav';
  
  return (
    <div className='layout'>
      <main className={`mainContent ${layoutClass}`}>
        {children}
      </main>
    </div>
  );
}