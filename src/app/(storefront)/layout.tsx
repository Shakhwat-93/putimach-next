import { getStorefrontCmsData } from '@/lib/serverCms';
import StorefrontClientLayout from '@/components/layout/StorefrontClientLayout';

export const dynamic = 'force-dynamic';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const cmsData = await getStorefrontCmsData();

  return (
    <StorefrontClientLayout cmsData={cmsData}>
      {children}
    </StorefrontClientLayout>
  );
}