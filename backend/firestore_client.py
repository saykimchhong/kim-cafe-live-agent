import asyncio
import uuid
from datetime import datetime, timezone

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

    async def _run_sync(self, func, *args):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args)

    async def create_session(self, session_id: str) -> dict:
        if not self.db:
            return {"id": session_id, "status": "mock"}

        session_data = {
            "sessionId": session_id,
            "startedAt": datetime.now(timezone.utc),
            "endedAt": None,
            "customerName": None,
            "customerAppearance": None,
            "events": [],
            "status": "active",
        }

        try:
            await self._run_sync(
                self.db.collection(self.sessions_collection).document(session_id).set,
                session_data,
            )
        except Exception as e:
            print(f"[Firestore] Failed to create session {session_id}: {e}", flush=True)

        return session_data

    async def add_session_event(self, session_id: str, event_type: str, data: dict) -> None:
        if not self.db:
            return

        event = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc),
            "data": data,
        }

        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            await self._run_sync(doc_ref.set, {"events": firestore.ArrayUnion([event])}, True)
        except Exception as e:
            print(f"[Firestore] Failed to add event to {session_id}: {e}", flush=True)

    async def update_session(self, session_id: str, updates: dict) -> None:
        if not self.db:
            return

        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            await self._run_sync(doc_ref.set, updates, True)
        except Exception as e:
            print(f"[Firestore] Failed to update session {session_id}: {e}", flush=True)

    async def end_session(self, session_id: str) -> None:
        if not self.db:
            return

        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            await self._run_sync(
                doc_ref.set,
                {"endedAt": datetime.now(timezone.utc), "status": "completed"},
                True,
            )
        except Exception as e:
            print(f"[Firestore] Failed to end session {session_id}: {e}", flush=True)

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
        now = datetime.now(timezone.utc)

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
            "createdAt": now,
            "updatedAt": now,
            "conversation": conversation,
        }

        if self.db:
            try:
                await self._run_sync(
                    self.db.collection(self.orders_collection).document(order_id).set,
                    order_data,
                )
            except Exception as e:
                print(f"[Firestore] Failed to create order {order_id}: {e}", flush=True)

        return order_data

    async def update_order_status(self, order_id: str, status: str) -> None:
        if not self.db:
            return

        try:
            doc_ref = self.db.collection(self.orders_collection).document(order_id)
            await self._run_sync(
                doc_ref.update,
                {"status": status, "updatedAt": datetime.now(timezone.utc)},
            )
        except Exception as e:
            print(f"[Firestore] Failed to update order {order_id}: {e}", flush=True)

    async def get_pending_orders(self) -> list[dict]:
        if not self.db:
            return []

        try:
            orders_ref = self.db.collection(self.orders_collection)
            query = orders_ref.where("status", "in", ["pending", "preparing", "ready"])

            def _fetch():
                docs = [doc.to_dict() for doc in query.stream()]
                return sorted(docs, key=lambda d: d.get("createdAt", datetime.min), reverse=True)

            return await self._run_sync(_fetch)
        except Exception as e:
            print(f"[Firestore] Failed to fetch orders: {e}", flush=True)
            return []

    async def get_order(self, order_id: str) -> dict | None:
        if not self.db:
            return None

        try:
            doc = await self._run_sync(
                self.db.collection(self.orders_collection).document(order_id).get
            )
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            print(f"[Firestore] Failed to get order {order_id}: {e}", flush=True)

        return None


firestore_client = FirestoreClient()
