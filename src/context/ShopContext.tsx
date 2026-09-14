import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { BarberShop } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface ShopContextValue {
  shops: BarberShop[];
  selectedShop: BarberShop | null;
  selectedShopId: string | null;
  setSelectedShopId: (id: string | null) => void;
  loading: boolean;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const STORAGE_KEY = 'selected_shop_id';

export function ShopProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [shops, setShops] = useState<BarberShop[]>([]);
  const [selectedShopId, setSelectedShopIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadShops = async () => {
    setLoading(true);
    if (profile?.role === 'super_admin') {
      const { data, error } = await supabase.from('barber_shops').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        setShops(data as BarberShop[]);
      }
    } else if (profile?.shop_id) {
      const { data, error } = await supabase.from('barber_shops').select('*').eq('id', profile.shop_id).maybeSingle();
      if (!error && data) {
        setShops([data as BarberShop]);
      }
    } else {
      setShops([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      loadShops();
    } else {
      setShops([]);
      setLoading(false);
    }
  }, [profile?.role, profile?.shop_id]);

  useEffect(() => {
    if (shops.length > 0 && !selectedShopId) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && shops.find(s => s.id === stored)) {
        setSelectedShopIdState(stored);
      } else {
        setSelectedShopIdState(shops[0].id);
      }
    }
  }, [shops, selectedShopId]);

  const setSelectedShopId = (id: string | null) => {
    setSelectedShopIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
  };

  const refreshShops = loadShops;

  const selectedShop = shops.find(s => s.id === selectedShopId) ?? null;

  return (
    <ShopContext.Provider value={{ shops, selectedShop, selectedShopId, setSelectedShopId, loading, refreshShops }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
