import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppShell from './AppShell.tsx';
import {AuthProvider} from './auth/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </StrictMode>,
);
