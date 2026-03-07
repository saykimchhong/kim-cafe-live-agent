import { create } from 'zustand';
import { AppState, ScreenName, KimState, MenuItem, CartItem } from '@/lib/types';
import { getMenuItemById } from '@/lib/websiteData';

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
  aiHighlightedItems: new Set<string>(),
  manuallySelectedItems: new Set<string>(),
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
    const aiHighlightedItems = new Set(get().aiHighlightedItems);
    if (itemId) {
      aiHighlightedItems.add(itemId);
    }
    set({ highlightedItem: itemId, aiHighlightedItems });
  },

  selectItem: (item: MenuItem | null, isManual: boolean = false) => {
    console.log('[store] selectItem ->', item ? item.id : null, 'manual:', isManual);
    const updates: Partial<AppState> = { selectedItem: item };
    
    if (isManual && item) {
      const manuallySelectedItems = new Set(get().manuallySelectedItems);
      manuallySelectedItems.add(item.id);
      updates.manuallySelectedItems = manuallySelectedItems;
    }
    
    set(updates);
  },

  shouldShowAIBadge: (itemId: string): boolean => {
    const { aiHighlightedItems, manuallySelectedItems, highlightedItem } = get();
    return (
      highlightedItem === itemId &&
      aiHighlightedItems.has(itemId) &&
      !manuallySelectedItems.has(itemId)
    );
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
    set({ 
      ...initialState, 
      sendMessage: get().sendMessage,
      aiHighlightedItems: new Set(),
      manuallySelectedItems: new Set(),
    });
  },

  setSendMessage: (sendMessage: (data: unknown) => void) => {
    set({ sendMessage });
  },
}));
