export type ScreenName = 'home' | 'coffee' | 'bakery' | 'cake' | 'food' | 'cart' | 'payment';

export type KimState = 'idle' | 'active' | 'speaking' | 'listening';

export type Category = 'coffee' | 'bakery' | 'cake' | 'food';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  image: string;
  customizations: string[];
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  customization?: string;
}

export interface OrderPayload {
  items: CartItem[];
  customerDescription: string;
  tableNumber: number;
  totalAmount: number;
}

export interface AgentAction {
  action: string;
  payload: unknown;
}

export interface AppState {
  screen: ScreenName;
  cart: CartItem[];
  highlightedItem: string | null;
  selectedItem: MenuItem | null;
  kimState: KimState;
  kimMessage: string;
  paymentAmount: number;
  isPaymentSuccess: boolean;
  sendMessage: ((data: unknown) => void) | null;
  aiHighlightedItems: Set<string>;
  manuallySelectedItems: Set<string>;

  navigateScreen: (screen: ScreenName) => void;
  addToCart: (itemId: string, quantity: number, customization?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  highlightItem: (itemId: string | null) => void;
  selectItem: (item: MenuItem | null, isManual?: boolean) => void;
  setKimState: (state: KimState) => void;
  setKimMessage: (message: string) => void;
  showPaymentQR: (amount: number) => void;
  completePayment: () => void;
  resetSession: () => void;
  setSendMessage: (sendMessage: (data: unknown) => void) => void;
  shouldShowAIBadge: (itemId: string) => boolean;
}
