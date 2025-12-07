import React from 'react';
import { BlockchainNetwork } from '../types';

interface ChainIndicatorProps {
  chain: BlockchainNetwork;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const CHAIN_CONFIG: Record<BlockchainNetwork, {
  name: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  polygon: {
    name: 'Polygon',
    color: '#8247E5',
    bgColor: 'rgba(130, 71, 229, 0.1)',
    icon: 'polygon',
  },
  solana: {
    name: 'Solana',
    color: '#14F195',
    bgColor: 'rgba(20, 241, 149, 0.1)',
    icon: 'solana',
  },
};

const PolygonIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 38 33" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28.8 10.8C28.1 10.4 27.2 10.4 26.4 10.8L21.3 13.8L17.7 15.8L12.7 18.8C12 19.2 11.1 19.2 10.3 18.8L6.4 16.5C5.7 16.1 5.2 15.3 5.2 14.5V10C5.2 9.2 5.6 8.4 6.4 8L10.3 5.8C11 5.4 11.9 5.4 12.7 5.8L16.6 8.1C17.3 8.5 17.8 9.3 17.8 10.1V13.1L21.4 10.9V7.8C21.4 7 21 6.2 20.2 5.8L12.8 1.5C12.1 1.1 11.2 1.1 10.4 1.5L2.8 5.9C2 6.3 1.6 7.1 1.6 7.9V16.6C1.6 17.4 2 18.2 2.8 18.6L10.3 22.9C11 23.3 11.9 23.3 12.7 22.9L17.7 20L21.3 17.9L26.3 15C27 14.6 27.9 14.6 28.7 15L32.6 17.2C33.3 17.6 33.8 18.4 33.8 19.2V23.7C33.8 24.5 33.4 25.3 32.6 25.7L28.8 27.9C28.1 28.3 27.2 28.3 26.4 27.9L22.5 25.7C21.8 25.3 21.3 24.5 21.3 23.7V20.8L17.7 23V26C17.7 26.8 18.1 27.6 18.9 28L26.4 32.3C27.1 32.7 28 32.7 28.8 32.3L36.3 28C37 27.6 37.5 26.8 37.5 26V17.2C37.5 16.4 37.1 15.6 36.3 15.2L28.8 10.8Z" fill="#8247E5"/>
  </svg>
);

const SolanaIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M64.6 237.9C67.1 235.4 70.5 234 74.1 234H389.5C395.4 234 398.4 241.3 394.2 245.5L332.5 307.2C330 309.7 326.6 311.1 323 311.1H7.6C1.7 311.1 -1.3 303.8 2.9 299.6L64.6 237.9Z" fill="url(#paint0_linear)"/>
    <path d="M64.6 3.8C67.2 1.3 70.6 0 74.1 0H389.5C395.4 0 398.4 7.3 394.2 11.5L332.5 73.2C330 75.7 326.6 77.1 323 77.1H7.6C1.7 77.1 -1.3 69.8 2.9 65.6L64.6 3.8Z" fill="url(#paint1_linear)"/>
    <path d="M332.5 120.1C330 117.6 326.6 116.2 323 116.2H7.6C1.7 116.2 -1.3 123.5 2.9 127.7L64.6 189.4C67.1 191.9 70.5 193.3 74.1 193.3H389.5C395.4 193.3 398.4 186 394.2 181.8L332.5 120.1Z" fill="url(#paint2_linear)"/>
    <defs>
      <linearGradient id="paint0_linear" x1="360.879" y1="-37.4554" x2="141.213" y2="383.294" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="264.829" y1="-87.6014" x2="45.163" y2="333.147" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="paint2_linear" x1="312.548" y1="-62.6878" x2="92.8822" y2="358.061" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
  </svg>
);

export const ChainIndicator: React.FC<ChainIndicatorProps> = ({ 
  chain, 
  size = 'md',
  showLabel = true 
}) => {
  const config = CHAIN_CONFIG[chain];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {chain === 'polygon' ? (
        <PolygonIcon size={iconSizes[size]} />
      ) : (
        <SolanaIcon size={iconSizes[size]} />
      )}
      {showLabel && <span>{config.name}</span>}
    </div>
  );
};

export default ChainIndicator;
