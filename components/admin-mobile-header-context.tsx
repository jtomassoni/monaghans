'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminMobileHeaderContextType {
  rightAction: ReactNode | null;
  setRightAction: (action: ReactNode | null) => void;
}

const AdminMobileHeaderContext = createContext<AdminMobileHeaderContextType | undefined>(undefined);

export function AdminMobileHeaderProvider({ children }: { children: ReactNode }) {
  const [rightAction, setRightAction] = useState<ReactNode | null>(null);

  return (
    <AdminMobileHeaderContext.Provider value={{ rightAction, setRightAction }}>
      {children}
    </AdminMobileHeaderContext.Provider>
  );
}

export function useAdminMobileHeader() {
  const context = useContext(AdminMobileHeaderContext);
  if (context === undefined) {
    throw new Error('useAdminMobileHeader must be used within AdminMobileHeaderProvider');
  }
  return context;
}


