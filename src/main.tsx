import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import './index.css';

function Root() {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.startsWith('/privacy')) {
    return <PrivacyPolicy />;
  }
  if (pathname.startsWith('/terms')) {
    return <TermsOfService />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

