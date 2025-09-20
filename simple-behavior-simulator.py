#!/usr/bin/env python3
"""
Simple Behavioral Simulator - Sends events via HTTP
"""

import requests
import time
import random
import json
from datetime import datetime

class SimpleSimulator:
    def __init__(self):
        self.session_id = f"sim_{int(time.time()*1000)}_{random.randint(1000,9999)}"
        self.tenant_id = "test"
        self.api_url = "http://localhost:3002/api/telemetry"
        self.events = []

    def send_events(self, events):
        """Send events batch via HTTP"""
        payload = {
            "sessionId": self.session_id,
            "tenantId": self.tenant_id,
            "events": events
        }

        try:
            response = requests.post(self.api_url, json=payload)
            if response.status_code == 200:
                print(f"✅ Sent {len(events)} events")
            else:
                print(f"❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")

    def simulate_price_shock(self):
        """Simulate price shock pattern"""
        print(f"\n🎬 PRICE SHOCK SIMULATION")
        print(f"   Session: {self.session_id}")

        events = []

        # Initial scroll
        for i in range(3):
            events.append({
                "type": "scroll",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "direction": "down",
                    "scrollPercentage": i * 10,
                    "scrollSpeed": 15
                }
            })

        self.send_events(events)
        time.sleep(1)

        # Approach price
        events = []
        events.append({
            "type": "price_proximity",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "element": "price",
                "distance": 50
            }
        })

        # Mouse movement with high velocity
        for i in range(5):
            events.append({
                "type": "mouse",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "x": 800 - i*20,
                    "y": 300 + i*10,
                    "velocity": 500 + i*100,
                    "acceleration": 200
                }
            })

        self.send_events(events)
        time.sleep(1)

        # Rapid exit
        events = []
        events.append({
            "type": "mouse_exit",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "data": {"velocity": 800}
        })

        events.append({
            "type": "viewport_approach",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "edge": "top",
                "distance": 10,
                "velocity": 900
            }
        })

        self.send_events(events)
        print("   Expected emotion: price_shock → abandonment_intent")

    def simulate_confusion(self):
        """Simulate confused visitor"""
        print(f"\n🎬 CONFUSION SIMULATION")
        print(f"   Session: {self.session_id}")

        events = []

        # Circular motions
        for i in range(5):
            events.append({
                "type": "circular_motion",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "radius": 100 + i*20
                }
            })

        # Direction changes
        for i in range(3):
            events.append({
                "type": "direction_changes",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "count": 8 + i*2
                }
            })

        self.send_events(events)
        print("   Expected emotion: confusion")

    def simulate_frustration(self):
        """Simulate frustrated user"""
        print(f"\n🎬 FRUSTRATION SIMULATION")
        print(f"   Session: {self.session_id}")

        events = []

        # Rage clicks
        for i in range(5):
            events.append({
                "type": "rage_click",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "count": 3,
                    "interval": 100
                }
            })

        self.send_events(events)
        print("   Expected emotion: frustration")

    def simulate_engagement(self):
        """Simulate engaged reader"""
        print(f"\n🎬 ENGAGEMENT SIMULATION")
        print(f"   Session: {self.session_id}")

        events = []

        # Steady scrolling
        for i in range(10):
            events.append({
                "type": "scroll",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "direction": "down",
                    "scrollPercentage": i * 8,
                    "scrollSpeed": 10
                }
            })

            if i % 3 == 0:
                # Reading pauses
                events.append({
                    "type": "idle",
                    "sessionId": self.session_id,
                    "timestamp": datetime.now().isoformat(),
                    "data": {"duration": 2000}
                })

        # Text selection
        events.append({
            "type": "text_selection",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "data": {
                "text": "Important feature description"
            }
        })

        self.send_events(events)
        print("   Expected emotion: engagement")

    def simulate_comparison_shopping(self):
        """Simulate comparison shopper"""
        print(f"\n🎬 COMPARISON SHOPPING SIMULATION")
        print(f"   Session: {self.session_id}")

        events = []

        # Check multiple prices
        for tier in ["basic", "pro", "enterprise"]:
            events.append({
                "type": "price_proximity",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "element": f"price_tier_{tier}",
                    "distance": 20
                }
            })

            events.append({
                "type": "text_selection",
                "sessionId": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "element": f"features_{tier}",
                    "text": f"{tier} features"
                }
            })

        # Tab switch
        events.append({
            "type": "tab_switch",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat()
        })

        self.send_events(events)
        print("   Expected emotion: comparison_shopping")

def main():
    import sys

    sim = SimpleSimulator()

    if len(sys.argv) > 1:
        scenario = sys.argv[1]

        if scenario == "price_shock":
            sim.simulate_price_shock()
        elif scenario == "confusion":
            sim.simulate_confusion()
        elif scenario == "frustration":
            sim.simulate_frustration()
        elif scenario == "engagement":
            sim.simulate_engagement()
        elif scenario == "comparison":
            sim.simulate_comparison_shopping()
        elif scenario == "all":
            # Run all scenarios with separate sessions
            print("\n🚀 RUNNING ALL SCENARIOS WITH CLEAN SESSIONS\n")

            # Each gets its own simulator instance
            sim1 = SimpleSimulator()
            sim1.simulate_price_shock()
            time.sleep(3)

            sim2 = SimpleSimulator()
            sim2.simulate_confusion()
            time.sleep(3)

            sim3 = SimpleSimulator()
            sim3.simulate_frustration()
            time.sleep(3)

            sim4 = SimpleSimulator()
            sim4.simulate_engagement()
            time.sleep(3)

            sim5 = SimpleSimulator()
            sim5.simulate_comparison_shopping()

            print("\n✅ All scenarios complete - check ML logs for accuracy")
        else:
            print(f"Unknown scenario: {scenario}")
    else:
        print("Usage:")
        print("  python simple-behavior-simulator.py price_shock")
        print("  python simple-behavior-simulator.py confusion")
        print("  python simple-behavior-simulator.py frustration")
        print("  python simple-behavior-simulator.py engagement")
        print("  python simple-behavior-simulator.py comparison")
        print("  python simple-behavior-simulator.py all        # Run all scenarios")

if __name__ == "__main__":
    main()