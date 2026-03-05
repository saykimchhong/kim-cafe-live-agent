import asyncio
import base64
import json
from typing import AsyncGenerator, Callable

from google import genai
from google.genai import types

from config import get_settings
from tools import get_tool_definitions
from prompts import get_system_prompt


class GeminiLiveClient:
    def __init__(
        self,
        on_text: Callable[[str], None] | None = None,
        on_audio: Callable[[bytes], None] | None = None,
        on_tool_call: Callable[[str, dict], None] | None = None,
    ):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.google_api_key)
        self.model = settings.gemini_model
        self.session = None
        self.on_text = on_text
        self.on_audio = on_audio
        self.on_tool_call = on_tool_call

    async def connect(self) -> None:
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore"
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=get_system_prompt())]
            ),
            tools=get_tool_definitions(),
        )
        
        self.session = await self.client.aio.live.connect(
            model=self.model,
            config=config,
        )

    async def disconnect(self) -> None:
        if self.session:
            await self.session.close()
            self.session = None

    async def send_audio(self, audio_data: bytes) -> None:
        if not self.session:
            return
        
        await self.session.send(
            input=types.LiveClientRealtimeInput(
                media_chunks=[
                    types.Blob(
                        mime_type="audio/pcm;rate=16000",
                        data=audio_data,
                    )
                ]
            )
        )

    async def send_video_frame(self, frame_base64: str) -> None:
        if not self.session:
            return
        
        await self.session.send(
            input=types.LiveClientRealtimeInput(
                media_chunks=[
                    types.Blob(
                        mime_type="image/jpeg",
                        data=base64.b64decode(frame_base64),
                    )
                ]
            )
        )

    async def send_text(self, text: str) -> None:
        if not self.session:
            return
        
        await self.session.send(
            input=types.LiveClientContent(
                turns=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=text)],
                    )
                ],
                turn_complete=True,
            )
        )

    async def send_tool_response(self, function_responses: list[dict]) -> None:
        if not self.session:
            return
        
        responses = []
        for resp in function_responses:
            responses.append(
                types.FunctionResponse(
                    name=resp["name"],
                    response=resp["response"],
                )
            )
        
        await self.session.send(
            input=types.LiveClientToolResponse(function_responses=responses)
        )

    async def receive_responses(self) -> AsyncGenerator[dict, None]:
        if not self.session:
            return
        
        async for response in self.session.receive():
            if response.server_content:
                content = response.server_content
                
                if content.model_turn:
                    for part in content.model_turn.parts:
                        if part.text:
                            yield {"type": "text", "data": part.text}
                            if self.on_text:
                                self.on_text(part.text)
                        
                        if part.inline_data:
                            audio_data = part.inline_data.data
                            yield {"type": "audio", "data": base64.b64encode(audio_data).decode()}
                            if self.on_audio:
                                self.on_audio(audio_data)
                
                if content.turn_complete:
                    yield {"type": "turn_complete", "data": None}
            
            if response.tool_call:
                for fc in response.tool_call.function_calls:
                    tool_data = {
                        "name": fc.name,
                        "args": dict(fc.args) if fc.args else {},
                        "id": fc.id,
                    }
                    yield {"type": "tool_call", "data": tool_data}
                    if self.on_tool_call:
                        self.on_tool_call(fc.name, dict(fc.args) if fc.args else {})
