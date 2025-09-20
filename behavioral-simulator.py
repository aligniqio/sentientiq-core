#!/usr/bin/env python3
"""
Behavioral Pattern Simulator

Generates realistic user behavior patterns and sends them to the telemetry system.
This allows us to train and test the ML emotion detection without human contamination.
"""

import asyncio
import json
import random
import time
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import websocket
import threading

class BehaviorSimulator:
    """Simulates realistic user behavior patterns"""

    def __init__(self, session_id: str = None, tenant_id: str = "test"):
        self.session_id = session_id or f"sim_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        self.tenant_id = tenant_id
        self.ws_url = "ws://localhost:3002/ws"  # NATS Gateway WebSocket endpoint
        self.current_position = {"x": 640, "y": 400}  # Start center screen
        self.current_scroll = 0
        self.events_buffer = []
        self.ws = None
        self.connected = False

    def connect(self):
        """Connect to WebSocket telemetry endpoint"""
        try:
            self.ws = websocket.WebSocketApp(
                self.ws_url,
                on_open=self.on_open,
                on_error=self.on_error,
                on_close=self.on_close
            )

            # Run in background thread
            wst = threading.Thread(target=self.ws.run_forever)
            wst.daemon = True
            wst.start()

            # Wait for connection
            time.sleep(2)

        except Exception as e:
            print(f"Connection error: {e}")

    def on_open(self, ws):
        """WebSocket opened"""
        self.connected = True
        print(f"✅ Connected as session: {self.session_id}")

        # Send initial connection event
        self.send_event({
            "type": "connection",
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "timestamp": datetime.now().isoformat(),
            "url": "https://example.com/pricing"
        })

    def on_error(self, ws, error):
        """WebSocket error"""
        print(f"❌ WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """WebSocket closed"""
        self.connected = False
        print(f"🔌 Disconnected: {close_msg}")

    def send_event(self, event: Dict):
        """Send event through WebSocket"""
        try:
            if self.ws and self.connected:
                payload = json.dumps({
                    "type": "telemetry",
                    "events": [event]
                })
                self.ws.send(payload)
                self.events_buffer.append(event)
                print(f"   → Sent {event['type']} event")
        except Exception as e:
            print(f"   ❌ Send error: {e}")

            # Keep buffer size limited
            if len(self.events_buffer) > 100:
                self.events_buffer = self.events_buffer[-100:]

    def generate_mouse_movement(self, target_x: int, target_y: int, duration: float = 1.0, style: str = "smooth"):
        """Generate realistic mouse movement from current position to target"""

        start_x, start_y = self.current_position["x"], self.current_position["y"]
        steps = int(duration * 20)  # 20 events per second

        events = []

        for i in range(steps):
            progress = (i + 1) / steps

            if style == "smooth":
                # Smooth interpolation
                x = start_x + (target_x - start_x) * progress
                y = start_y + (target_y - start_y) * progress
                velocity = abs(target_x - start_x) / duration

            elif style == "hesitant":
                # Stuttering movement with pauses
                if random.random() < 0.3:  # 30% chance to pause
                    x, y = self.current_position["x"], self.current_position["y"]
                    velocity = 0
                else:
                    x = start_x + (target_x - start_x) * progress * random.uniform(0.8, 1.2)
                    y = start_y + (target_y - start_y) * progress * random.uniform(0.8, 1.2)
                    velocity = random.uniform(50, 200)

            elif style == "aggressive":
                # Fast, direct movement
                x = start_x + (target_x - start_x) * progress ** 0.5
                y = start_y + (target_y - start_y) * progress ** 0.5
                velocity = random.uniform(500, 1000)

            else:  # erratic
                # Random jittery movement
                x = start_x + (target_x - start_x) * progress + random.uniform(-50, 50)
                y = start_y + (target_y - start_y) * progress + random.uniform(-50, 50)
                velocity = random.uniform(100, 800)

            self.current_position = {"x": x, "y": y}

            events.append({
                "type": "mouse",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "x": int(x),
                    "y": int(y),
                    "velocity": velocity,
                    "acceleration": random.uniform(-100, 100) if style == "erratic" else 0
                }
            })

        return events

    def generate_scroll(self, target_depth: int, speed: str = "normal"):
        """Generate scroll events"""

        events = []
        current = self.current_scroll

        if speed == "fast":
            step = 20
            delay = 0.05
        elif speed == "slow":
            step = 5
            delay = 0.2
        else:  # normal
            step = 10
            delay = 0.1

        while current < target_depth:
            current = min(current + step, target_depth)
            self.current_scroll = current

            events.append({
                "type": "scroll",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "scrollPercentage": current,
                    "direction": "down",
                    "scrollSpeed": step / delay
                }
            })

            time.sleep(delay)

        return events

    def generate_rage_clicks(self, count: int = 5):
        """Generate rage click pattern"""
        events = []

        for _ in range(count):
            events.append({
                "type": "rage_click",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "count": count,
                    "interval": 100,
                    "x": self.current_position["x"],
                    "y": self.current_position["y"]
                }
            })
            time.sleep(0.1)

        return events

    def generate_circular_motion(self, radius: int = 100, revolutions: int = 2):
        """Generate circular mouse motion (confusion pattern)"""
        events = []
        center_x = self.current_position["x"]
        center_y = self.current_position["y"]

        steps = 20 * revolutions
        for i in range(steps):
            angle = (i / steps) * 2 * np.pi * revolutions
            x = center_x + radius * np.cos(angle)
            y = center_y + radius * np.sin(angle)

            events.append({
                "type": "circular_motion",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "x": int(x),
                    "y": int(y),
                    "radius": radius
                }
            })

            self.current_position = {"x": x, "y": y}
            time.sleep(0.05)

        return events

    def generate_price_approach(self, hover_duration: float = 2.0, retreat: bool = True):
        """Simulate approaching price element"""
        events = []

        # Move to price area
        price_x, price_y = 800, 300  # Assuming price is here

        # Approach slowly
        events.extend(self.generate_mouse_movement(price_x, price_y, 1.5, "hesitant"))

        # Hover event
        events.append({
            "type": "price_proximity",
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "element": "price_tier_1",
                "distance": 0
            }
        })

        # Dwell on price
        time.sleep(hover_duration)

        if retreat:
            # Quick retreat (sticker shock)
            events.extend(self.generate_mouse_movement(400, 500, 0.3, "aggressive"))
            events.append({
                "type": "mouse_exit",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {"velocity": 800}
            })

        return events

    def generate_text_selection(self, element: str = "pricing_feature"):
        """Simulate text selection (comparison behavior)"""
        events = []

        events.append({
            "type": "text_selection",
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "element": element,
                "text": "Premium features included",
                "duration": 1500
            }
        })

        return events

    def generate_exit_pattern(self):
        """Generate exit intent pattern"""
        events = []

        # Idle first
        events.append({
            "type": "idle",
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "timestamp": datetime.now().isoformat(),
            "data": {"duration": 3000}
        })

        time.sleep(3)

        # Move rapidly upward
        events.extend(self.generate_mouse_movement(
            self.current_position["x"],
            10,  # Near top
            0.5,
            "aggressive"
        ))

        # Viewport approach
        events.append({
            "type": "viewport_approach",
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "edge": "top",
                "distance": 10,
                "velocity": 600
            }
        })

        return events

    async def simulate_scenario(self, scenario_name: str):
        """Run a complete behavioral scenario"""

        print(f"\n🎬 Starting scenario: {scenario_name}")

        if scenario_name == "confident_buyer":
            # Confident buyer - reads, evaluates, proceeds to purchase
            await self.send_events(self.generate_scroll(30, "normal"))
            await asyncio.sleep(2)  # Reading
            await self.send_events(self.generate_scroll(60, "slow"))
            await asyncio.sleep(3)  # Deep reading
            await self.send_events(self.generate_mouse_movement(800, 400, 1.0, "smooth"))
            await self.send_events([{
                "type": "cta_proximity",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat(),
                "data": {"element": "buy_now_button"}
            }])
            print("   Expected: engagement → purchase_intent")

        elif scenario_name == "price_shocker":
            # Sticker shock - approach price, freeze, exit
            await self.send_events(self.generate_scroll(20, "normal"))
            await self.send_events(self.generate_price_approach(2.0, retreat=True))
            print("   Expected: curiosity → price_shock → abandonment_intent")

        elif scenario_name == "confused_visitor":
            # Confused - circular motions, random clicking
            await self.send_events(self.generate_circular_motion(150, 3))
            await self.send_events(self.generate_rage_clicks(3))
            await self.send_events(self.generate_circular_motion(100, 2))
            print("   Expected: confusion → frustration")

        elif scenario_name == "comparison_shopper":
            # Comparing options - text selection, price checking
            await self.send_events(self.generate_scroll(40, "normal"))
            await self.send_events(self.generate_text_selection("pricing_tier_1"))
            await asyncio.sleep(1)
            await self.send_events(self.generate_text_selection("pricing_tier_2"))
            await self.send_events(self.generate_price_approach(1.0, retreat=False))
            await self.send_events([{
                "type": "tab_switch",
                "sessionId": self.session_id,
                "tenantId": self.tenant_id,
                "timestamp": datetime.now().isoformat()
            }])
            print("   Expected: evaluation → comparison_shopping")

        elif scenario_name == "abandoner":
            # Clear abandonment - idle then exit
            await self.send_events(self.generate_scroll(15, "fast"))
            await self.send_events(self.generate_exit_pattern())
            print("   Expected: curiosity → abandonment_intent")

        elif scenario_name == "skeptical_reader":
            # Skeptical - lots of re-reading, scrolling up and down
            await self.send_events(self.generate_scroll(50, "normal"))
            await asyncio.sleep(2)
            await self.send_events(self.generate_scroll(20, "slow"))  # Scroll back up
            await asyncio.sleep(3)  # Re-reading
            await self.send_events(self.generate_scroll(50, "slow"))
            print("   Expected: interest → skepticism")

        else:
            print(f"   Unknown scenario: {scenario_name}")

    async def send_events(self, events: List[Dict]):
        """Send a batch of events"""
        for event in events:
            self.send_event(event)
            await asyncio.sleep(0.05)  # Small delay between events


class ScenarioRunner:
    """Runs multiple scenarios for training"""

    def __init__(self):
        self.scenarios = [
            "confident_buyer",
            "price_shocker",
            "confused_visitor",
            "comparison_shopper",
            "abandoner",
            "skeptical_reader"
        ]

    async def run_training_batch(self, iterations: int = 5):
        """Run multiple iterations of each scenario"""

        print(f"🚀 Running {iterations} iterations of {len(self.scenarios)} scenarios")
        print(f"   Total simulations: {iterations * len(self.scenarios)}")

        for i in range(iterations):
            print(f"\n📊 Iteration {i + 1}/{iterations}")

            for scenario in self.scenarios:
                # Create new simulator for each scenario
                sim = BehaviorSimulator()
                sim.connect()

                await asyncio.sleep(2)  # Let connection establish

                if sim.connected:
                    await sim.simulate_scenario(scenario)
                    await asyncio.sleep(5)  # Gap between scenarios

                    if sim.ws:
                        sim.ws.close()
                else:
                    print(f"   ⚠️ Failed to connect for {scenario}")

        print("\n✅ Training batch complete!")
        print("   Check the ML emotion logs to see if patterns are being detected correctly")


async def main():
    """Main entry point"""
    import sys

    if len(sys.argv) > 1:
        scenario = sys.argv[1]

        if scenario == "train":
            # Run training batch
            runner = ScenarioRunner()
            await runner.run_training_batch(3)
        else:
            # Run single scenario
            sim = BehaviorSimulator()
            sim.connect()
            await asyncio.sleep(2)

            if sim.connected:
                await sim.simulate_scenario(scenario)
                await asyncio.sleep(2)
                sim.ws.close()
    else:
        print("Usage:")
        print("  python behavioral-simulator.py train           # Run training batch")
        print("  python behavioral-simulator.py confident_buyer # Run single scenario")
        print("  python behavioral-simulator.py price_shocker")
        print("  python behavioral-simulator.py confused_visitor")
        print("  python behavioral-simulator.py comparison_shopper")
        print("  python behavioral-simulator.py abandoner")
        print("  python behavioral-simulator.py skeptical_reader")


if __name__ == "__main__":
    asyncio.run(main())