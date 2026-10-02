import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="page-container">
      <main className="animate-fade-in">
        {children}
      </main>
    </div>
  );
}