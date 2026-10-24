import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import AuthenticatedLandingPage from './AuthenticatedLandingPage';
import GuestLandingPage from './GuestLandingPage';

export default function LandingPage() {
  const authenticated = useAuthStore((state) => state.sessionStatus === 'authenticated' && !!state.user);
  return authenticated ? <AuthenticatedLandingPage /> : <GuestLandingPage />;
}
