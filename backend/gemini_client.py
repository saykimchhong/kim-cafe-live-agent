import asyncio
import base64
from typing import AsyncGenerator, Callable

from google import genai
from google.genai import types

from config import get_settings
from prompts import get_system_prompt
from tools import get_tool_definitions


class GeminiLiveClient:
    def __init__(
        self,
        on_text: Callable[[str], None] | None = None,
        on_audio: Callable[[bytes], None] | None = None,
        on_tool_call: Callable[[str, dict], None] | None = None,
    ):
        settings = get_settings()
        self.client = genai.Client(
            api_key=settings.google_api_key,
            http_options={"api_version": "v1alpha"},
        )
        self.model = f"models/{settings.gemini_model}"
        self.session = None
        self._is_connected = False
        self.on_text = on_text
        self.on_audio = on_audio
        self.on_tool_call = on_tool_call

    async def connect(self) -> None:
        self._last_audio_chunk = None
        self._audio_count = 0
        
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part(text=get_system_prompt())]
            ),
            tools=get_tool_definitions(),
            generation_config=types.GenerationConfig(
                temperature=0.8,
                top_p=0.95,
                top_k=40,
            ),
        )
        self._session_context = self.client.aio.live.connect(
            model=self.model,
            config=config,
        )
        self.session = await self._session_context.__aenter__()
        self._is_connected = True

    async def disconnect(self) -> None:
        self._is_connected = False  # Mark disconnected first to stop new sends
        if self._session_context and self.session:
            try:
                await self._session_context.__aexit__(None, None, None)
            except Exception:
                pass  # Ignore errors during disconnect
            self.session = None
            self._session_context = None

    async def send_audio(self, audio_data: bytes) -> None:
        if not self._is_connected or not self.session or len(audio_data) == 0:
            return
        try:
            realtime_input = types.LiveClientRealtimeInput(
                mediaChunks=[types.Blob(data=audio_data, mime_type="audio/pcm")]
            )
            await self.session.send(input=realtime_input)
        except Exception:
            self._is_connected = False

    async def send_video_frame(self, frame_base64: str) -> None:
        if not self._is_connected or not self.session:
            return
        try:
            await self.session.send(input={
                "data": frame_base64,
                "mime_type": "image/jpeg"
            })
        except Exception:
            self._is_connected = False

    async def send_text(self, text: str) -> None:
        if not self._is_connected or not self.session:
            return
        try:
            await self.session.send(input=text, end_of_turn=True)
        except Exception:
            self._is_connected = False

    async def send_tool_response(self, function_responses: list[dict]) -> None:
        if not self._is_connected or not self.session:
            return
        
        try:
            import json
            from datetime import datetime
            
            def serialize(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                if isinstance(obj, dict):
                    return {k: serialize(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [serialize(i) for i in obj]
                return obj
            
            responses = []
            for resp in function_responses:
                responses.append(
                    types.FunctionResponse(
                        name=resp["name"],
                        id=resp.get("id"),
                        response=serialize(resp["response"]),
                    )
                )
            
            await self.session.send(
                input=types.LiveClientToolResponse(function_responses=responses)
            )
        except Exception as e:
            self._is_connected = False
            print(f"[Error] Tool response: {e}", flush=True)

    async def receive_responses(self) -> AsyncGenerator[dict, None]:
        if not self.session:
            return
        
        from diagnostic_wrapper import diagnostic
        turn_count = 0
        
        while True:
            turn_count += 1
            diagnostic.start_turn()
            turn = self.session.receive()
            
            response_count = 0
            has_audio = False
            has_text = False
            has_tool_call = False
            
            async for response in turn:
                response_count += 1
                
                if data := response.data:
                    has_audio = True
                    if isinstance(data, bytes):
                        is_base64 = all(32 <= b < 127 for b in data[:100])
                        if is_base64:
                            yield {"type": "audio", "data": data.decode('utf-8')}
                        else:
                            yield {"type": "audio", "data": base64.b64encode(data).decode()}
                    else:
                        yield {"type": "audio", "data": str(data)}
                    if self.on_audio:
                        self.on_audio(data)
                
                if text := response.text:
                    has_text = True
                
                if hasattr(response, 'tool_call') and response.tool_call:
                    has_tool_call = True
                    for fc in response.tool_call.function_calls:
                        diagnostic.mark("model_decided_tool", {"tool": fc.name})
                        tool_data = {
                            "name": fc.name,
                            "args": dict(fc.args) if fc.args else {},
                            "id": fc.id if hasattr(fc, 'id') else None,
                        }
                        print(f"[AI] Tool: {tool_data['name']}({tool_data['args']})", flush=True)
                        yield {"type": "tool_call", "data": tool_data}
                        if self.on_tool_call:
                            self.on_tool_call(fc.name, dict(fc.args) if fc.args else {})
            
            if has_audio or has_tool_call:
                print(f"[AI] Turn #{turn_count} done (audio:{has_audio} tools:{has_tool_call})", flush=True)
            yield {"type": "turn_complete", "data": None}
