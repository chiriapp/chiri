/**
 * TypeScript declarations for lucide-react tree-shakable icon imports
 *
 * this enables importing from 'lucide-react/icons/*' paths which are
 * resolved by Vite to individual ESM files for proper tree-shaking
 *
 * usage: import LoaderCircle from 'lucide-react/icons/loader-circle';
 */

declare module 'lucide-react/icons/*' {
  import type { LucideIcon } from '$types/lucide';

  const Icon: LucideIcon;
  export default Icon;
}
