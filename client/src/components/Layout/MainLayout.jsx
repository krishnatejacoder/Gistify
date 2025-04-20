import { useLocation } from 'react-router-dom';
import './MainLayout.css';

export default function MainLayout({children}){
  const notNavItems = ['/login', '/signup'];
  const location = useLocation();
  return(
    <div className='layout'>
      <main className='mainContent' style={notNavItems.includes(location.pathname) ? {marginTop: '0px'} : {marginTop: '100px'}}>
        {children}
      </main>
    </div>
  );
}