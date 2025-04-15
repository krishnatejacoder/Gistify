import './MainLayout.css';

export default function MainLayout({children}){
  return(
    <div className='layout'>
      <main className='mainContent'>
        {children}
      </main>
    </div>
  );
}