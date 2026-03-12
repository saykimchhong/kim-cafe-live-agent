import asyncio
import base64
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_settings
from gemini_client import GeminiLiveClient
from session_manager import session_manager, SessionState, TAX_RATE
from firestore_client import firestore_client
from menu_data import MENU_ITEMS, MENU_DICT, get_menu_item_by_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Kim Cafe Vision Backend Starting...")
    yield
    print("Kim Cafe Vision Backend Shutting Down...")


app = FastAPI(
    title="Kim Cafe Vision API",
    description="AI-powered cafe ordering assistant backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrderStatusUpdate(BaseModel):
    status: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/menu")
async def get_menu():
    return {"items": MENU_ITEMS}


@app.get("/orders")
async def get_orders(status: Optional[str] = None):
    if status:
        orders = await firestore_client.get_pending_orders()
        orders = [o for o in orders if o.get("status") == status]
    else:
        orders = await firestore_client.get_pending_orders()
    return {"orders": orders}


@app.get("/kitchen/orders")
async def get_kitchen_orders():
    orders = await firestore_client.get_pending_orders()
    return {"orders": orders}


@app.patch("/orders/{order_id}")
async def update_order(order_id: str, update: OrderStatusUpdate):
    await firestore_client.update_order_status(order_id, update.status)
    return {"success": True}


@app.patch("/kitchen/orders/{order_id}")
async def update_kitchen_order(order_id: str, update: OrderStatusUpdate):
    await firestore_client.update_order_status(order_id, update.status)
    return {"success": True}


async def handle_tool_call(
    session: SessionState,
    tool_name: str,
    tool_args: dict,
    websocket: WebSocket,
) -> dict:
    result = {"success": True}
    frontend_action = {"action": tool_name, "payload": None}

    if tool_name == "navigate_screen":
        frontend_action["payload"] = tool_args.get("screen", "home")

    elif tool_name == "highlight_item":
        item_id = tool_args.get("item_id")
        item = get_menu_item_by_id(item_id)
        if item:
            frontend_action["payload"] = item_id
        else:
            result["success"] = False
            result["error"] = f"Item '{item_id}' not found. Check exact item_id from menu."
            frontend_action = None

    elif tool_name == "select_item":
        item_id = tool_args.get("item_id")
        item = get_menu_item_by_id(item_id)
        if item:
            frontend_action["payload"] = item_id
            result["item_name"] = item["name"]
            result["price"] = item["price"]
            if item.get("customizations"):
                result["has_customizations"] = True
            print(f"Showing item: {result['item_name']} (${result['price']})")
        else:
            result["success"] = False
            result["error"] = f"Item '{item_id}' not found. Check exact item_id from menu."
            frontend_action = None

    elif tool_name == "close_detail":
        frontend_action["action"] = "close_detail"
        frontend_action["payload"] = None

    elif tool_name == "add_to_cart":
        item_id = tool_args.get("item_id")
        quantity = tool_args.get("quantity", 1)
        customization = tool_args.get("customization")

        menu_item = get_menu_item_by_id(item_id)
        if not menu_item:
            result["success"] = False
            result["error"] = f"Item '{item_id}' not found. Use exact item_id like 'coffee-latte', 'food-sandwich'."
            frontend_action = None
        else:
            session.add_to_cart(item_id, quantity, customization)
            frontend_action["payload"] = {
                "itemId": item_id,
                "quantity": quantity,
                "customization": customization,
            }
            result["item_name"] = menu_item["name"]
            result["total"] = session.get_total(MENU_DICT)
            print(f"Added to cart: {result['item_name']} x{quantity}, total: ${result['total']}")

    elif tool_name == "remove_from_cart":
        item_id = tool_args.get("item_id")
        removed = session.remove_from_cart(item_id)
        frontend_action["payload"] = item_id
        result["removed"] = removed

    elif tool_name == "set_customer_info":
        session.set_customer_info(
            name=tool_args.get("name"),
            appearance=tool_args.get("appearance"),
            table_or_location=tool_args.get("table_or_location"),
        )
        result["customer_info"] = {
            "name": session.customer_name,
            "appearance": session.customer_appearance,
            "location": session.table_or_location,
        }
        frontend_action = None

    elif tool_name == "show_payment":
        amount = tool_args.get("amount", 0)

        if not session.cart:
            result["error"] = "Cart is empty! Add items before going to payment."
            result["success"] = False
            frontend_action = None
            print("WARNING: Attempted to show payment with empty cart!")
        else:
            expected_total = session.get_total(MENU_DICT)
            if abs(amount - expected_total) > 0.50:
                print(f"WARNING: AI amount ${amount} differs from expected ${expected_total}")
                amount = expected_total

            result["total"] = amount
            result["cart_items"] = len(session.cart)
            await websocket.send_json({"action": "navigate_screen", "payload": "cart"})
            frontend_action["action"] = "show_payment"
            frontend_action["payload"] = amount

    elif tool_name == "get_cart_summary":
        subtotal = session.get_subtotal(MENU_DICT)
        tax = round(subtotal * TAX_RATE, 2)
        total_with_tax = round(subtotal + tax, 2)

        cart_items = []
        for cart_item in session.cart:
            menu_item = MENU_DICT.get(cart_item["itemId"])
            if menu_item:
                item_total = menu_item["price"] * cart_item["quantity"]
                cart_items.append({
                    "name": menu_item["name"],
                    "quantity": cart_item["quantity"],
                    "customization": cart_item.get("customization"),
                    "price": menu_item["price"],
                    "line_total": round(item_total, 2),
                })

        result["cart_items"] = cart_items
        result["subtotal"] = subtotal
        result["tax"] = tax
        result["total"] = total_with_tax
        result["item_count"] = len(session.cart)
        result["is_empty"] = len(session.cart) == 0
        result["customer_name"] = session.customer_name

        if session.cart:
            print(f"Cart summary: {len(session.cart)} items, subtotal ${subtotal:.2f}, total ${total_with_tax:.2f}")
        else:
            print("Cart summary: EMPTY")

        frontend_action = None

    elif tool_name == "submit_to_kitchen":
        items_with_details = []
        for cart_item in session.cart:
            menu_item = MENU_DICT.get(cart_item["itemId"])
            if menu_item:
                items_with_details.append({
                    "itemId": cart_item["itemId"],
                    "name": menu_item["name"],
                    "quantity": cart_item["quantity"],
                    "customization": cart_item.get("customization"),
                    "price": menu_item["price"],
                })

        order = await firestore_client.create_order(
            session_id=session.session_id,
            customer_name=session.customer_name or tool_args.get("customer_name", "Guest"),
            customer_appearance=session.customer_appearance or tool_args.get("customer_appearance", ""),
            table_or_location=session.table_or_location or tool_args.get("table_or_location", ""),
            items=items_with_details,
            total_amount=session.get_total(MENU_DICT),
            conversation=session.conversation,
        )

        frontend_action["action"] = "order_submitted"
        frontend_action["payload"] = {
            "orderId": order["orderId"],
            "customerName": order["customerName"],
        }
        result["orderId"] = order["orderId"]
        result["customerName"] = order["customerName"]
        result["totalAmount"] = order["totalAmount"]
        print(f"[ORDER] {order['orderId']} for {order['customerName']} - ${order['totalAmount']:.2f}")

    if frontend_action:
        await websocket.send_json(frontend_action)

    asyncio.create_task(firestore_client.add_session_event(
        session.session_id,
        "tool_call",
        {"tool": tool_name, "args": tool_args, "result": result},
    ))

    return result


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    session = session_manager.create_session()
    asyncio.create_task(firestore_client.create_session(session.session_id))

    print(f"Session started: {session.session_id}")
    
    gemini = GeminiLiveClient()
    receive_task = None
    audio_task = None
    last_warning_time = 0.0
    audio_queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    
    try:
        await gemini.connect()
        print(f"[Session] {session.session_id} started")
        
        await websocket.send_json({
            "action": "session_started",
            "payload": {"sessionId": session.session_id},
        })

        await gemini.send_text("A new customer just approached the kiosk. Greet them warmly!")
        
        async def process_gemini_responses():
            had_audio = False
            try:
                async for response in gemini.receive_responses():
                    session.update_activity()
                    
                    if response["type"] == "text":
                        text = response["data"]
                        session.add_conversation_event("kim", text)
                        await websocket.send_json({"action": "kim_speak", "payload": text})
                    
                    elif response["type"] == "audio":
                        had_audio = True
                        await websocket.send_json({"action": "kim_audio", "payload": response["data"]})
                    
                    elif response["type"] == "tool_call":
                        from diagnostic_wrapper import diagnostic
                        diagnostic.mark("tool_call_received", {"tool": response["data"]["name"]})
                        tool_data = response["data"]
                        result = await handle_tool_call(session, tool_data["name"], tool_data["args"], websocket)
                        diagnostic.mark("tool_executed")
                        await gemini.send_tool_response([{
                            "name": tool_data["name"],
                            "id": tool_data.get("id"),
                            "response": result,
                        }])
                        diagnostic.mark("tool_response_sent")
                    
                    elif response["type"] == "turn_complete":
                        from diagnostic_wrapper import diagnostic
                        diagnostic.print_summary()
                        diagnostic.reset()
                        if had_audio:
                            await websocket.send_json({"action": "kim_state", "payload": "listening"})
                            had_audio = False
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[Error] Gemini responses: {e}", flush=True)
                try:
                    await websocket.send_json({"action": "session_ended", "payload": None})
                except Exception:
                    pass
        
        receive_task = asyncio.create_task(process_gemini_responses())

        async def audio_sender():
            while True:
                try:
                    audio_bytes = await asyncio.wait_for(audio_queue.get(), timeout=0.5)
                    await gemini.send_audio(audio_bytes)
                except asyncio.TimeoutError:
                    if receive_task and receive_task.done():
                        break
                except asyncio.CancelledError:
                    raise
                except Exception:
                    pass

        audio_task = asyncio.create_task(audio_sender())
        
        while True:
            if receive_task and receive_task.done():
                break
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=1.0,
                )
            except asyncio.TimeoutError:
                elapsed = (datetime.now(timezone.utc) - session.last_activity).total_seconds()

                if elapsed > 120 and session.is_active:
                    print(f"[Timeout] Session inactive for {elapsed:.0f}s, ending session", flush=True)
                    await websocket.send_json({
                        "action": "session_timeout",
                        "payload": None,
                    })
                    break
                elif elapsed > 60 and (elapsed - last_warning_time) >= 30:
                    last_warning_time = elapsed
                    print(f"[Warning] Session inactive for {elapsed:.0f}s", flush=True)
                    await websocket.send_json({
                        "action": "session_warning",
                        "payload": "Still there?",
                    })
                
                continue
            
            session.update_activity()
            msg_type = data.get("type")
            
            if msg_type == "audio":
                audio_b64 = data.get("data", "")
                if not audio_b64:
                    continue
                audio_bytes = base64.b64decode(audio_b64)
                try:
                    audio_queue.put_nowait(audio_bytes)
                except asyncio.QueueFull:
                    pass
            
            elif msg_type == "video":
                frame_b64 = data.get("data", "")
                try:
                    await gemini.send_video_frame(frame_b64)
                except Exception as e:
                    print(f"[Error] Video frame failed: {e}", flush=True)
            
            elif msg_type == "text":
                text = data.get("data", "")
                print(f"Sending text to Gemini: {text[:50]}...", flush=True)
                session.add_conversation_event("customer", text)
                try:
                    await gemini.send_text(text)
                    print(f"Text sent successfully", flush=True)
                except Exception as e:
                    print(f"Error sending text: {e}", flush=True)
            
            elif msg_type == "end_session":
                await websocket.send_json({
                    "action": "session_ended",
                    "payload": None,
                })
                break
            
            elif msg_type == "payment_complete":
                session.add_conversation_event("system", "Payment completed")
                await gemini.send_text("The customer has completed payment. Thank them and let them know their order will be ready soon.")
    
    except WebSocketDisconnect:
        print(f"Client disconnected: {session.session_id}", flush=True)
    
    except Exception as e:
        import traceback
        print(f"Error in session {session.session_id}: {e}", flush=True)
        traceback.print_exc()
        try:
            await websocket.send_json({
                "action": "error",
                "payload": str(e),
            })
        except:
            pass
    
    finally:
        if audio_task:
            audio_task.cancel()
            try:
                await audio_task
            except asyncio.CancelledError:
                pass
        if receive_task:
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass
        
        await gemini.disconnect()
        await firestore_client.end_session(session.session_id)
        session_manager.end_session(session.session_id)
        
        print(f"Session ended: {session.session_id}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
