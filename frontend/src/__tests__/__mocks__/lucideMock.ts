import React from 'react';

// Stub all lucide-react icons as simple SVG elements
const Icon = ({ size, ...props }: { size?: number; [key: string]: unknown }) =>
  React.createElement('svg', { 'data-testid': 'icon', ...props });

export const Play = Icon;
export const Pause = Icon;
export const RotateCcw = Icon;
export const ChevronLeft = Icon;
export const ChevronRight = Icon;
export const Users = Icon;
export const PlaySquare = Icon;
export const Home = Icon;
export const BarChart2 = Icon;
export const Clock = Icon;
export const Zap = Icon;
export const AlertCircle = Icon;
