import React from 'react';

interface BrandTextProps {
  className?: string;
  primaryClassName?: string;
  accentClassName?: string;
}

const BrandText: React.FC<BrandTextProps> = ({ className = '', primaryClassName = '', accentClassName = '' }) => (
  <span className={`font-bold ${className}`}>
    <span className={primaryClassName}>PRICE </span>
    <span className={accentClassName}>E-Classroom</span>
  </span>
);

export default BrandText;