'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorefrontCmsData, BrandSettings, ContactInfo } from '@/lib/serverCms';
import { supabase } from '@/lib/supabase';

interface StorefrontCmsContextValue extends StorefrontCmsData {
  updateBrandSettings: (brand: Partial<BrandSettings>) => void;
}

const StorefrontCmsContext = createContext<StorefrontCmsContextValue | null>(null);

export function StorefrontCmsProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: StorefrontCmsData;
}) {
  const [data, setData] = useState<StorefrontCmsData>(initialData);

  const updateBrandSettings = (brand: Partial<BrandSettings>) => {
    setData((prev) => ({
      ...prev,
      brandSettings: {
        ...prev.brandSettings,
        ...brand,
      },
    }));
  };

  return (
    <StorefrontCmsContext.Provider
      value={{
        ...data,
        updateBrandSettings,
      }}
    >
      {children}
    </StorefrontCmsContext.Provider>
  );
}

export function useStorefrontCms() {
  const context = useContext(StorefrontCmsContext);
  return context;
}
