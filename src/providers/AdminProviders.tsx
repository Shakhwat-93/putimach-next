'use client';
import { AuthProvider } from '../admin/context/AuthContext';
import { ThemeProvider } from '../admin/context/ThemeContext';
import { OrderProvider } from '../admin/context/OrderContext';
import { TaskProvider } from '../admin/context/TaskContext';
import { NotificationProvider } from '../admin/context/NotificationContext';
import { CourierRatioProvider } from '../admin/context/CourierRatioContext';
import { BrandingProvider } from '../admin/context/BrandingContext';
import { PwaInstallProvider } from '../admin/context/PwaInstallContext';
import { RuntimeProvider } from '../admin/context/RuntimeContext';

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <BrandingProvider>
            <PwaInstallProvider>
              <RuntimeProvider>
                <OrderProvider>
                  <TaskProvider>
                    <CourierRatioProvider>
                      {children}
                    </CourierRatioProvider>
                  </TaskProvider>
                </OrderProvider>
              </RuntimeProvider>
            </PwaInstallProvider>
          </BrandingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}