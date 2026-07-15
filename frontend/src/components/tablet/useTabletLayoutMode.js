import { getTabletSplitMode } from '../../config/breakpoints';
import { useLayout } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';

// Single width signal for the tablet master-detail decision: TabletPageShell
// and TabletCollectionPage both derive 'split' | 'stacked' from the SAME
// measured effective content width (viewport minus AppShell sidebar chrome),
// so the shell and the row-push controller can never disagree.
export const useTabletLayoutMode = () => {
  const { width, usesCompactNavigation } = useNavigation();
  const { sidebarWidth } = useLayout();
  return getTabletSplitMode({ width, usesCompactNavigation, sidebarWidth });
};

export default useTabletLayoutMode;
