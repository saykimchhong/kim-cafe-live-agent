import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class SessionState:
    session_id: str
    started_at: datetime = field(default_factory=datetime.utcnow)
    customer_name: str | None = None
    customer_appearance: str | None = None
    table_or_location: str | None = None
    cart: list[dict] = field(default_factory=list)
    conversation: list[dict] = field(default_factory=list)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    def add_to_cart(self, item_id: str, quantity: int, customization: str | None = None) -> dict:
        cart_item = {
            "id": f"{item_id}-{len(self.cart)}",
            "itemId": item_id,
            "quantity": quantity,
            "customization": customization,
        }
        self.cart.append(cart_item)
        return cart_item
    
    def remove_from_cart(self, item_id: str) -> bool:
        for i, item in enumerate(self.cart):
            if item["id"] == item_id or item["itemId"] == item_id:
                self.cart.pop(i)
                return True
        return False
    
    def clear_cart(self) -> None:
        self.cart = []
    
    def get_total(self, menu_items: dict) -> float:
        total = 0.0
        for cart_item in self.cart:
            menu_item = menu_items.get(cart_item["itemId"])
            if menu_item:
                total += menu_item["price"] * cart_item["quantity"]
        return round(total * 1.08, 2)
    
    def add_conversation_event(self, role: str, text: str) -> None:
        self.conversation.append({
            "role": role,
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    def update_activity(self) -> None:
        self.last_activity = datetime.utcnow()
    
    def set_customer_info(
        self,
        name: str | None = None,
        appearance: str | None = None,
        table_or_location: str | None = None,
    ) -> None:
        if name:
            self.customer_name = name
        if appearance:
            self.customer_appearance = appearance
        if table_or_location:
            self.table_or_location = table_or_location


class SessionManager:
    def __init__(self):
        self.sessions: dict[str, SessionState] = {}
    
    def create_session(self) -> SessionState:
        session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
        session = SessionState(session_id=session_id)
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> SessionState | None:
        return self.sessions.get(session_id)
    
    def end_session(self, session_id: str) -> None:
        session = self.sessions.get(session_id)
        if session:
            session.is_active = False
    
    def remove_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)
    
    def get_inactive_sessions(self, timeout_seconds: int = 40) -> list[str]:
        now = datetime.utcnow()
        inactive = []
        for session_id, session in self.sessions.items():
            if session.is_active:
                elapsed = (now - session.last_activity).total_seconds()
                if elapsed > timeout_seconds:
                    inactive.append(session_id)
        return inactive


session_manager = SessionManager()
