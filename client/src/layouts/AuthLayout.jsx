import { Outlet } from 'react-router-dom';

// Auth pages (Login, Signup) handle their own full-page layout
// This layout simply renders them directly
const AuthLayout = () => <Outlet />;

export default AuthLayout;
