from datetime import datetime
from typing import Any
import uuid

from google.cloud import firestore

from config import get_settings


class FirestoreClient:
    def __init__(self):
        settings = get_settings()
        if settings.google_cloud_project:
            self.db = firestore.Client(project=settings.google_cloud_project)
        else:
            self.db = None
        self.orders_collection = settings.firestore_collection_orders
        self.sessions_collection = settings.firestore_collection_sessions

    def _generate_id(self, prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    async def create_session(self, session_id: str) -> dict:
        if not self.db:
            return {"id": session_id, "status": "mock"}
        
        session_data = {
            "sessionId": session_id,
            "startedAt": datetime.utcnow(),
            "endedAt": None,
            "customerName": None,
            "customerAppearance": None,
            "events": [],
            "status": "active",
        }
        
        self.db.collection(self.sessions_collection).document(session_id).set(session_data)
        return session_data

    async def add_session_event(self, session_id: str, event_type: str, data: dict) -> None:
        if not self.db:
            return
        
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow(),
            "data": data,
        }
        
        doc_ref = self.db.collection(self.sessions_collection).document(session_id)
        doc_ref.update({"events": firestore.ArrayUnion([event])})

    async def update_session(self, session_id: str, updates: dict) -> None:
        if not self.db:
            return
        
        doc_ref = self.db.collection(self.sessions_collection).document(session_id)
        doc_ref.update(updates)

    async def end_session(self, session_id: str) -> None:
        if not self.db:
            return
        
        doc_ref = self.db.collection(self.sessions_collection).document(session_id)
        doc_ref.update({
            "endedAt": datetime.utcnow(),
            "status": "completed",
        })

    async def create_order(
        self,
        session_id: str,
        customer_name: str,
        customer_appearance: str,
        table_or_location: str,
        items: list[dict],
        total_amount: float,
        conversation: list[dict],
    ) -> dict:
        order_id = self._generate_id("ORD")
        payment_id = self._generate_id("PAY")
        
        order_data = {
            "orderId": order_id,
            "paymentId": payment_id,
            "sessionId": session_id,
            "customerName": customer_name,
            "customerAppearance": customer_appearance,
            "tableOrLocation": table_or_location,
            "items": items,
            "totalAmount": total_amount,
            "status": "pending",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "conversation": conversation,
        }
        
        if self.db:
            self.db.collection(self.orders_collection).document(order_id).set(order_data)
        
        return order_data

    async def update_order_status(self, order_id: str, status: str) -> None:
        if not self.db:
            return
        
        doc_ref = self.db.collection(self.orders_collection).document(order_id)
        doc_ref.update({
            "status": status,
            "updatedAt": datetime.utcnow(),
        })

    async def get_pending_orders(self) -> list[dict]:
        if not self.db:
            return []
        
        orders_ref = self.db.collection(self.orders_collection)
        query = orders_ref.where("status", "in", ["pending", "preparing"]).order_by("createdAt")
        
        orders = []
        for doc in query.stream():
            orders.append(doc.to_dict())
        
        return orders

    async def get_order(self, order_id: str) -> dict | None:
        if not self.db:
            return None
        
        doc = self.db.collection(self.orders_collection).document(order_id).get()
        if doc.exists:
            return doc.to_dict()
        return None


firestore_client = FirestoreClient()
