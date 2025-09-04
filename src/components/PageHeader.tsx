import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`glass-card p-5 mb-6 ${className}`}>
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-white/70">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;