import asyncio
import base64
import json
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/menu")
async def get_menu():
    return {"items": MENU_ITEMS}


@app.get("/orders")
async def get_orders():
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
    print(f"Tool call: {tool_name} with args: {tool_args}")
    
    result = {"success": True}
    frontend_action = {"action": tool_name, "payload": None}
    
    if tool_name == "navigate_screen":
        frontend_action["payload"] = tool_args.get("screen", "home")
    
    elif tool_name == "highlight_item":
        frontend_action["payload"] = tool_args.get("item_id")
    
    elif tool_name == "select_item":
        item_id = tool_args.get("item_id")
        frontend_action["payload"] = item_id
        item = get_menu_item_by_id(item_id)
        if item:
            result["item"] = item
    
    elif tool_name == "close_detail":
        frontend_action["action"] = "close_detail"
        frontend_action["payload"] = None
    
    elif tool_name == "add_to_cart":
        item_id = tool_args.get("item_id")
        quantity = tool_args.get("quantity", 1)
        customization = tool_args.get("customization")
        
        cart_item = session.add_to_cart(item_id, quantity, customization)
        frontend_action["payload"] = {
            "itemId": item_id,
            "quantity": quantity,
            "customization": customization,
        }
        result["cart_item"] = cart_item
    
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
        frontend_action["action"] = "show_payment"
        frontend_action["payload"] = amount
    
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
        result["order"] = order
        
        print(f"Order submitted: {order['orderId']} for {order['customerName']}")
    
    if frontend_action:
        await websocket.send_json(frontend_action)
    
    await firestore_client.add_session_event(
        session.session_id,
        "tool_call",
        {"tool": tool_name, "args": tool_args, "result": result},
    )
    
    return result


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    session = session_manager.create_session()
    await firestore_client.create_session(session.session_id)
    
    print(f"Session started: {session.session_id}")
    
    gemini = GeminiLiveClient()
    receive_task = None
    
    try:
        await gemini.connect()
        print(f"Gemini connected for session: {session.session_id}")
        
        await websocket.send_json({
            "action": "session_started",
            "payload": {"sessionId": session.session_id},
        })
        
        async def process_gemini_responses():
            pending_tool_calls = []
            
            async for response in gemini.receive_responses():
                session.update_activity()
                
                if response["type"] == "text":
                    text = response["data"]
                    session.add_conversation_event("kim", text)
                    await websocket.send_json({
                        "action": "kim_speak",
                        "payload": text,
                    })
                
                elif response["type"] == "audio":
                    await websocket.send_json({
                        "action": "kim_audio",
                        "payload": response["data"],
                    })
                
                elif response["type"] == "tool_call":
                    tool_data = response["data"]
                    result = await handle_tool_call(
                        session,
                        tool_data["name"],
                        tool_data["args"],
                        websocket,
                    )
                    pending_tool_calls.append({
                        "name": tool_data["name"],
                        "response": result,
                    })
                
                elif response["type"] == "turn_complete":
                    if pending_tool_calls:
                        await gemini.send_tool_response(pending_tool_calls)
                        pending_tool_calls = []
                    
                    await websocket.send_json({
                        "action": "kim_state",
                        "payload": "listening",
                    })
        
        receive_task = asyncio.create_task(process_gemini_responses())
        
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=1.0,
                )
            except asyncio.TimeoutError:
                elapsed = (datetime.utcnow() - session.last_activity).total_seconds()
                
                if elapsed > 40 and session.is_active:
                    await websocket.send_json({
                        "action": "session_timeout",
                        "payload": None,
                    })
                    break
                elif elapsed > 20:
                    await websocket.send_json({
                        "action": "session_warning",
                        "payload": "Still there?",
                    })
                
                continue
            
            session.update_activity()
            msg_type = data.get("type")
            
            if msg_type == "audio":
                audio_b64 = data.get("data", "")
                audio_bytes = base64.b64decode(audio_b64)
                await gemini.send_audio(audio_bytes)
                
                await websocket.send_json({
                    "action": "kim_state",
                    "payload": "speaking",
                })
            
            elif msg_type == "video":
                frame_b64 = data.get("data", "")
                await gemini.send_video_frame(frame_b64)
            
            elif msg_type == "text":
                text = data.get("data", "")
                session.add_conversation_event("customer", text)
                await gemini.send_text(text)
            
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
        print(f"Client disconnected: {session.session_id}")
    
    except Exception as e:
        print(f"Error in session {session.session_id}: {e}")
        await websocket.send_json({
            "action": "error",
            "payload": str(e),
        })
    
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
