import LandingPage from '@/components/landing/landing-page';

// Authenticated users are redirected to /campaigns by middleware.
// This page only renders for unauthenticated visitors.
export default function HomePage() {
  return <LandingPage />;
}
