import time
import json
from typing import Any
from datetime import datetime


class TimingDiagnostic:
    def __init__(self):
        self.events = []
        self.turn_start = None
        self.last_tool_call = None
        
    def mark(self, event_name: str, metadata: dict = None):
        timestamp = time.time()
        event = {
            "time": timestamp,
            "event": event_name,
            "readable": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "metadata": metadata or {}
        }
        
        if self.turn_start:
            event["elapsed"] = round((timestamp - self.turn_start) * 1000, 2)
        
        self.events.append(event)
        return timestamp
    
    def start_turn(self):
        self.turn_start = time.time()
        self.mark("turn_start")
        
    def get_gaps(self):
        if len(self.events) < 2:
            return []
        
        gaps = []
        for i in range(1, len(self.events)):
            prev = self.events[i-1]
            curr = self.events[i]
            gap_ms = round((curr["time"] - prev["time"]) * 1000, 2)
            gaps.append({
                "from": prev["event"],
                "to": curr["event"],
                "gap_ms": gap_ms
            })
        return gaps
    
    def print_summary(self):
        if not self.events:
            return
            
        print("\n" + "="*60)
        print("TIMING DIAGNOSTIC SUMMARY")
        print("="*60)
        
        for event in self.events:
            elapsed = f"+{event.get('elapsed', 0)}ms" if 'elapsed' in event else "START"
            metadata = f" | {event['metadata']}" if event['metadata'] else ""
            print(f"[{event['readable']}] {event['event']:25s} {elapsed:>10s}{metadata}")
        
        print("\n" + "-"*60)
        print("GAPS ANALYSIS")
        print("-"*60)
        
        gaps = self.get_gaps()
        critical_gaps = [g for g in gaps if g["gap_ms"] > 1000]
        
        for gap in gaps:
            marker = " ⚠️ CRITICAL" if gap["gap_ms"] > 1000 else ""
            print(f"{gap['from']:20s} → {gap['to']:20s}: {gap['gap_ms']:>8.2f}ms{marker}")
        
        if critical_gaps:
            print("\n" + "!"*60)
            print(f"FOUND {len(critical_gaps)} CRITICAL GAPS (>1000ms)")
            for gap in critical_gaps:
                print(f"  - {gap['from']} → {gap['to']}: {gap['gap_ms']:.0f}ms")
            print("!"*60)
        
        print("="*60 + "\n")
        
    def reset(self):
        self.events = []
        self.turn_start = None
        self.last_tool_call = None


class ContextSizeMonitor:
    @staticmethod
    def estimate_tokens(text: str) -> int:
        return len(text.split()) * 1.3
    
    @staticmethod
    def measure_system_prompt():
        from prompts import get_system_prompt
        prompt = get_system_prompt()
        tokens = ContextSizeMonitor.estimate_tokens(prompt)
        chars = len(prompt)
        lines = prompt.count('\n')
        
        print("\n" + "="*60)
        print("SYSTEM PROMPT SIZE ANALYSIS")
        print("="*60)
        print(f"Characters: {chars:,}")
        print(f"Lines: {lines}")
        print(f"Estimated tokens: {int(tokens):,}")
        print(f"Size category: {'🔴 TOO LARGE' if tokens > 1500 else '🟡 LARGE' if tokens > 1000 else '🟢 OK'}")
        print("="*60 + "\n")
        
        return {
            "chars": chars,
            "lines": lines,
            "tokens": int(tokens)
        }
    
    @staticmethod
    def measure_tool_response(tool_name: str, response: dict):
        json_str = json.dumps(response)
        tokens = ContextSizeMonitor.estimate_tokens(json_str)
        chars = len(json_str)
        
        print(f"\n[TOOL RESPONSE SIZE] {tool_name}")
        print(f"  Chars: {chars}, Tokens: ~{int(tokens)}")
        print(f"  Keys: {list(response.keys())}")
        
        redundant_keys = ["item", "description", "customizations", "ask_customer"]
        found_redundant = [k for k in redundant_keys if k in response]
        if found_redundant:
            print(f"  ⚠️ Redundant keys: {found_redundant}")
        
        return {
            "tool": tool_name,
            "chars": chars,
            "tokens": int(tokens)
        }


diagnostic = TimingDiagnostic()
context_monitor = ContextSizeMonitor()


if __name__ == "__main__":
    print("Diagnostic Tools Ready")
    print("-" * 60)
    context_monitor.measure_system_prompt()
