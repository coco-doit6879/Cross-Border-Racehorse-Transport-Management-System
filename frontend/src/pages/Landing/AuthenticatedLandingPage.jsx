import React from 'react';
import {Navigate} from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import CustomerHome from '../Dashboard/CustomerHome';
import {useAuthStore} from '../../store/useAuthStore';
export default function AuthenticatedLandingPage(){const user=useAuthStore(s=>s.user);return user?.role==='CUSTOMER'?<MainLayout><CustomerHome/></MainLayout>:<Navigate to="/manager" replace/>;}
