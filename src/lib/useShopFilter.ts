import { useAuth } from '@/context/AuthContext';
import { useShop } from '@/context/ShopContext';

/**
 * Returns a shop_id filter to apply to queries when the logged-in user is a super_admin.
 * For non-super_admin roles, returns null (RLS already filters by their shop).
 */
export function useShopFilter(): string | null {
  const { profile } = useAuth();
  const { selectedShopId } = useShop();

  if (profile?.role === 'super_admin') {
    return selectedShopId;
  }
  return null;
}
