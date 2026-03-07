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
from session_manager import session_manager, SessionState
from firestore_client import firestore_client
from menu_data import MENU_ITEMS, get_menu_item_by_id


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
    """Get orders from Firestore. If no status provided, returns pending/preparing orders."""
    if status:
        # For specific status filtering, we can extend firestore_client later
        orders = await firestore_client.get_pending_orders()
        orders = [o for o in orders if o.get("status") == status]
    else:
        orders = await firestore_client.get_pending_orders()
    return {"orders": orders}


@app.patch("/orders/{order_id}")
async def update_order(order_id: str, update: OrderStatusUpdate):
    await firestore_client.update_order_status(order_id, update.status)
    return {"success": True}


async def handle_tool_call(
    session: SessionState,
    tool_name: str,
    tool_args: dict,
    websocket: WebSocket,
) -> dict:
    # Logging is done in gemini_client.py
    
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
            result["item"] = item
            result["item_name"] = item["name"]
            result["price"] = item["price"]
            result["description"] = item["description"]
            result["customizations"] = item.get("customizations", [])
            if result["customizations"]:
                result["ask_customer"] = f"Available options: {', '.join(result['customizations'])}. Ask if they want any of these."
            print(f"Showing item: {result['item_name']} (${result['price']}) with {len(result['customizations'])} customization options")
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
        
        # Validate item exists first
        menu_item = get_menu_item_by_id(item_id)
        if not menu_item:
            result["success"] = False
            result["error"] = f"Item '{item_id}' not found. Use exact item_id like 'coffee-latte', 'food-sandwich'."
            frontend_action = None
        else:
            cart_item = session.add_to_cart(item_id, quantity, customization)
            item_price = menu_item["price"]
            
            frontend_action["payload"] = {
                "itemId": item_id,
                "quantity": quantity,
                "customization": customization,
            }
            result["cart_item"] = cart_item
            result["item_name"] = menu_item["name"]
            result["item_price"] = item_price
            result["line_total"] = round(item_price * quantity, 2)
            
            # Calculate current cart total
            menu_lookup = {item["id"]: item for item in MENU_ITEMS}
            cart_total = session.get_total(menu_lookup)
            result["cart_total"] = cart_total
            result["cart_item_count"] = len(session.cart)
            
            print(f"Added to cart: {result['item_name']} x{quantity} = ${result['line_total']}, Cart total: ${cart_total}")
    
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
        
        # Verify cart is not empty before payment
        if not session.cart:
            result["error"] = "Cart is empty! Add items before going to payment."
            result["success"] = False
            frontend_action = None
            print("WARNING: Attempted to show payment with empty cart!")
        else:
            # Calculate expected total
            menu_lookup = {item["id"]: item for item in MENU_ITEMS}
            expected_total = session.get_total(menu_lookup)
            
            # Use expected total if AI's amount is way off
            if abs(amount - expected_total) > 0.50:
                print(f"WARNING: AI amount ${amount} differs from expected ${expected_total}")
                amount = expected_total
            
            result["total"] = amount
            result["cart_items"] = len(session.cart)
            
            # Navigate to cart, then show payment immediately
            await websocket.send_json({"action": "navigate_screen", "payload": "cart"})
            frontend_action["action"] = "show_payment"
            frontend_action["payload"] = amount
    
    elif tool_name == "get_cart_summary":
        # Return cart contents and total for AI to verify
        menu_lookup = {item["id"]: item for item in MENU_ITEMS}
        cart_items = []
        subtotal = 0.0
        
        for cart_item in session.cart:
            menu_item = menu_lookup.get(cart_item["itemId"])
            if menu_item:
                item_total = menu_item["price"] * cart_item["quantity"]
                subtotal += item_total
                cart_items.append({
                    "name": menu_item["name"],
                    "quantity": cart_item["quantity"],
                    "customization": cart_item.get("customization"),
                    "price": menu_item["price"],
                    "line_total": round(item_total, 2),
                })
        
        total_with_tax = round(subtotal * 1.08, 2)
        
        result["cart_items"] = cart_items
        result["subtotal"] = round(subtotal, 2)
        result["tax"] = round(subtotal * 0.08, 2)
        result["total"] = total_with_tax
        result["item_count"] = len(session.cart)
        result["is_empty"] = len(session.cart) == 0
        result["customer_name"] = session.customer_name
        
        if session.cart:
            print(f"Cart summary: {len(session.cart)} items, subtotal ${subtotal:.2f}, total ${total_with_tax:.2f}")
        else:
            print("Cart summary: EMPTY")
        
        frontend_action = None  # No UI action needed
    
    elif tool_name == "submit_to_kitchen":
        menu_lookup = {item["id"]: item for item in MENU_ITEMS}
        items_with_details = []
        for cart_item in session.cart:
            menu_item = menu_lookup.get(cart_item["itemId"])
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
            total_amount=session.get_total(menu_lookup),
            conversation=session.conversation,
        )
        
        frontend_action["action"] = "order_submitted"
        frontend_action["payload"] = {
            "orderId": order["orderId"],
            "customerName": order["customerName"],
        }
        # Only include serializable fields in result
        result["orderId"] = order["orderId"]
        result["customerName"] = order["customerName"]
        result["totalAmount"] = order["totalAmount"]
        
        print(f"[ORDER] {order['orderId']} for {order['customerName']} - ${order['totalAmount']:.2f}")
    
    # Send UI action immediately (don't block)
    if frontend_action:
        await websocket.send_json(frontend_action)
    
    # Fire-and-forget Firestore logging (don't block tool response)
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
    # Fire-and-forget Firestore session creation - don't block connection
    asyncio.create_task(firestore_client.create_session(session.session_id))
    
    print(f"Session started: {session.session_id}")
    
    gemini = GeminiLiveClient()
    receive_task = None
    greeting_sent = False  # Track if we've triggered the greeting
    
    try:
        await gemini.connect()
        print(f"[Session] {session.session_id} started")
        
        await websocket.send_json({
            "action": "session_started",
            "payload": {"sessionId": session.session_id},
        })
        
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
                        # Process tool immediately and send response
                        tool_data = response["data"]
                        result = await handle_tool_call(session, tool_data["name"], tool_data["args"], websocket)
                        await gemini.send_tool_response([{
                            "name": tool_data["name"],
                            "id": tool_data.get("id"),
                            "response": result,
                        }])
                    
                    elif response["type"] == "turn_complete":
                        # Only send listening state if there was audio (avoid spam)
                        if had_audio:
                            await websocket.send_json({"action": "kim_state", "payload": "listening"})
                            had_audio = False
            except Exception as e:
                print(f"[Error] Gemini responses: {e}", flush=True)
        
        receive_task = asyncio.create_task(process_gemini_responses())
        
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=1.0,
                )
            except asyncio.TimeoutError:
                elapsed = (datetime.now(timezone.utc) - session.last_activity.replace(tzinfo=timezone.utc)).total_seconds()
                
                # Increase timeout to 120 seconds (2 minutes) to avoid premature disconnection
                if elapsed > 120 and session.is_active:
                    print(f"[Timeout] Session inactive for {elapsed:.0f}s, ending session", flush=True)
                    await websocket.send_json({
                        "action": "session_timeout",
                        "payload": None,
                    })
                    break
                elif elapsed > 60 and int(elapsed) % 30 == 0:  # Warn once every 30 seconds
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
                # Send audio without blocking - don't spam state updates
                asyncio.create_task(gemini.send_audio(audio_bytes))
            
            elif msg_type == "video":
                frame_b64 = data.get("data", "")
                await gemini.send_video_frame(frame_b64)
                
                # Trigger greeting after first video frame (so AI can see customer)
                if not greeting_sent:
                    greeting_sent = True
                    await gemini.send_text("A new customer just approached. Greet them warmly!")
            
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
