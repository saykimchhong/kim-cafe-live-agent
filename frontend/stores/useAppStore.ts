import { create } from 'zustand';
import { AppState, ScreenName, KimState, MenuItem, CartItem } from '@/lib/types';
import { getMenuItemById } from '@/lib/mockData';

const initialState = {
  screen: 'home' as ScreenName,
  cart: [] as CartItem[],
  highlightedItem: null as string | null,
  selectedItem: null as MenuItem | null,
  kimState: 'idle' as KimState,
  kimMessage: '',
  paymentAmount: 0,
  isPaymentSuccess: false,
  sendMessage: null as ((data: unknown) => void) | null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  navigateScreen: (screen: ScreenName) => {
    console.log('[store] navigateScreen ->', screen);
    set({ screen, selectedItem: null, highlightedItem: null });
  },

  addToCart: (itemId: string, quantity: number, customization?: string) => {
    const menuItem = getMenuItemById(itemId);
    if (!menuItem) return;

    const cart = get().cart;
    const existingIndex = cart.findIndex(
      (item) => item.menuItem.id === itemId && item.customization === customization
    );

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantity;
      set({ cart: updatedCart });
    } else {
      const newItem: CartItem = {
        id: `${itemId}-${Date.now()}`,
        menuItem,
        quantity,
        customization,
      };
      set({ cart: [...cart, newItem] });
    }
  },

  removeFromCart: (itemId: string) => {
    set({ cart: get().cart.filter((item) => item.id !== itemId) });
  },

  updateCartQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    const updatedCart = get().cart.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    set({ cart: updatedCart });
  },

  clearCart: () => {
    set({ cart: [] });
  },

  highlightItem: (itemId: string | null) => {
    console.log('[store] highlightItem ->', itemId);
    set({ highlightedItem: itemId });
  },

  selectItem: (item: MenuItem | null) => {
    console.log('[store] selectItem ->', item ? item.id : null);
    set({ selectedItem: item });
  },

  setKimState: (kimState: KimState) => {
    set({ kimState });
  },

  setKimMessage: (kimMessage: string) => {
    set({ kimMessage });
  },

  showPaymentQR: (amount: number) => {
    set({ paymentAmount: amount, screen: 'payment' });
  },

  completePayment: () => {
    set({ isPaymentSuccess: true });
  },

  resetSession: () => {
    set({ ...initialState, sendMessage: get().sendMessage });
  },

  setSendMessage: (sendMessage: (data: unknown) => void) => {
    set({ sendMessage });
  },
}));
