import { Navigate } from 'react-router-dom';

// Redirect to billing page for now
export default function Pricing() {
  return <Navigate to="/billing" replace />;
}