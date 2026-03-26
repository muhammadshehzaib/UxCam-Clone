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
export const X = Icon;
export const Filter = Icon;
export const Flame = Icon;
export const Monitor = Icon;
export const GitBranch = Icon;
export const Plus = Icon;
export const Trash2 = Icon;
export const ChevronDown = Icon;
export const Bug = Icon;
export const AlertTriangle = Icon;
export const ExternalLink = Icon;
export const Eye = Icon;
export const EyeOff = Icon;
export const LogIn = Icon;
export const LogOut = Icon;
export const FolderOpen = Icon;
export const Check = Icon;
export const Workflow = Icon;
export const ArrowRight = Icon;
