import React from 'react';

export interface ContentProps {
  children?: React.ReactNode;
}

export default function Content({ children }: ContentProps) {
  return (
    <div className="overflow-hidden w-full h-full border-l border-solid dark:border-gray-700">
      {children}
    </div>
  );
}
