#!/usr/bin/env python3
"""
MONETIZATION STRESS TEST SUITE
Hammers every aspect of the billing system
"""

import asyncio
import aiohttp
import time
import json
import random
from typing import Dict, List
from datetime import datetime

# Configuration
API_BASE = "http://localhost:8000"
FRONTEND_BASE = "http://localhost:3000"

# Test users with different plans
TEST_USERS = [
    {"id": "user_free_1", "plan": "free", "expected_limit": 20},
    {"id": "user_free_2", "plan": "free", "expected_limit": 20},
    {"id": "user_pro_1", "plan": "pro", "expected_limit": None},
    {"id": "user_team_1", "plan": "team", "org_id": "org_1", "expected_limit": None},
]

class MonetizationTester:
    def __init__(self):
        self.results = {
            "rate_limits": [],
            "payment_required": [],
            "successful_asks": [],
            "errors": [],
            "performance": []
        }
        
    async def test_rate_limiting(self, session: aiohttp.ClientSession):
        """Test that free users hit 20 question limit"""
        print("\n🔥 TESTING RATE LIMITS...")
        
        for user in TEST_USERS:
            if user["plan"] != "free":
                continue
                
            print(f"\n  Testing {user['id']} (expecting {user['expected_limit']} questions)...")
            
            # Hammer the API with questions
            for i in range(25):  # Try 25 questions (should fail after 20)
                headers = {
                    "X-User-Id": user["id"],
                    "X-Plan": user["plan"],
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "question": f"Test question {i+1} from {user['id']}",
                    "agent": random.choice(["Strategy", "Emotion", "ROI", "Chaos"])
                }
                
                try:
                    start = time.time()
                    async with session.post(
                        f"{API_BASE}/ask",
                        headers=headers,
                        json=payload
                    ) as resp:
                        elapsed = time.time() - start
                        
                        if resp.status == 200:
                            data = await resp.json()
                            self.results["successful_asks"].append({
                                "user": user["id"],
                                "question": i+1,
                                "time": elapsed
                            })
                            print(f"    ✓ Question {i+1}: SUCCESS ({elapsed:.2f}s)")
                            
                        elif resp.status == 402:  # Payment Required
                            self.results["payment_required"].append({
                                "user": user["id"],
                                "question": i+1,
                                "message": await resp.text()
                            })
                            print(f"    💰 Question {i+1}: PAYMENT REQUIRED (limit reached!)")
                            break
                            
                        elif resp.status == 429:  # Rate Limited
                            self.results["rate_limits"].append({
                                "user": user["id"],
                                "question": i+1,
                                "message": await resp.text()
                            })
                            print(f"    ⏱️ Question {i+1}: RATE LIMITED")
                            await asyncio.sleep(1)  # Wait before retry
                            
                        else:
                            error = await resp.text()
                            self.results["errors"].append({
                                "user": user["id"],
                                "question": i+1,
                                "status": resp.status,
                                "error": error
                            })
                            print(f"    ✗ Question {i+1}: ERROR {resp.status}")
                            
                except Exception as e:
                    self.results["errors"].append({
                        "user": user["id"],
                        "question": i+1,
                        "error": str(e)
                    })
                    print(f"    ✗ Question {i+1}: EXCEPTION {e}")
                    
    async def test_pro_unlimited(self, session: aiohttp.ClientSession):
        """Test that Pro users have unlimited access"""
        print("\n🚀 TESTING PRO UNLIMITED...")
        
        pro_user = next(u for u in TEST_USERS if u["plan"] == "pro")
        print(f"  Hammering with {pro_user['id']}...")
        
        # Fire 50 rapid requests
        tasks = []
        for i in range(50):
            headers = {
                "X-User-Id": pro_user["id"],
                "X-Plan": pro_user["plan"],
                "Content-Type": "application/json"
            }
            
            payload = {
                "question": f"Pro rapid fire {i+1}",
                "agent": "Strategy"
            }
            
            task = session.post(f"{API_BASE}/ask", headers=headers, json=payload)
            tasks.append(task)
            
        print(f"  Sending 50 concurrent requests...")
        start = time.time()
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = time.time() - start
        
        success_count = sum(1 for r in responses if not isinstance(r, Exception) and r.status == 200)
        rate_limit_count = sum(1 for r in responses if not isinstance(r, Exception) and r.status == 429)
        
        print(f"  ✓ {success_count}/50 succeeded in {elapsed:.2f}s")
        if rate_limit_count > 0:
            print(f"  ⏱️ {rate_limit_count} hit per-minute cap (expected for burst)")
            
        self.results["performance"].append({
            "test": "pro_burst",
            "requests": 50,
            "success": success_count,
            "rate_limited": rate_limit_count,
            "time": elapsed,
            "rps": 50 / elapsed
        })
        
    async def test_minute_caps(self, session: aiohttp.ClientSession):
        """Test per-minute rate limiting"""
        print("\n⏰ TESTING PER-MINUTE CAPS...")
        
        # Free user should hit minute cap at 30
        user = TEST_USERS[0]  # free user
        print(f"  Bursting {user['id']} to test minute cap...")
        
        headers = {
            "X-User-Id": user["id"] + "_burst",  # New user to avoid monthly limit
            "X-Plan": "free",
            "Content-Type": "application/json"
        }
        
        burst_count = 0
        rate_limited = False
        
        for i in range(40):  # Try 40 rapid requests
            payload = {"question": f"Burst {i+1}", "agent": "Emotion"}
            
            async with session.post(f"{API_BASE}/ask", headers=headers, json=payload) as resp:
                if resp.status == 200:
                    burst_count += 1
                elif resp.status == 429:
                    rate_limited = True
                    print(f"  ✓ Hit minute cap after {burst_count} requests (expected ~30)")
                    break
                    
        if not rate_limited:
            print(f"  ⚠️ No rate limit hit after {burst_count} requests!")
            
    async def test_webhook_simulation(self, session: aiohttp.ClientSession):
        """Simulate Stripe webhook events"""
        print("\n🪝 TESTING WEBHOOK HANDLING...")
        
        webhook_events = [
            {
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "subscription": "sub_test123",
                        "metadata": {"clerk_user_id": "user_upgrade_test"}
                    }
                }
            },
            {
                "type": "customer.subscription.updated",
                "data": {
                    "object": {
                        "items": {"data": [{"price": {"id": "price_pro"}}]},
                        "metadata": {"clerk_user_id": "user_change_test"}
                    }
                }
            },
            {
                "type": "customer.subscription.deleted",
                "data": {
                    "object": {
                        "metadata": {"clerk_user_id": "user_cancel_test"}
                    }
                }
            }
        ]
        
        for event in webhook_events:
            print(f"  Sending {event['type']}...")
            
            # Note: This will fail without proper Stripe signature
            # But tests that endpoint exists and handles requests
            try:
                async with session.post(
                    f"{API_BASE}/stripe/webhook",
                    json=event,
                    headers={"Stripe-Signature": "test_sig"}
                ) as resp:
                    if resp.status == 400:
                        print(f"    ✓ Webhook rejected (expected without valid signature)")
                    else:
                        print(f"    Response: {resp.status}")
            except Exception as e:
                print(f"    Error: {e}")
                
    async def test_edge_cases(self, session: aiohttp.ClientSession):
        """Test edge cases and error conditions"""
        print("\n🔪 TESTING EDGE CASES...")
        
        tests = [
            {
                "name": "Missing headers",
                "headers": {"Content-Type": "application/json"},
                "payload": {"question": "No auth", "agent": "Strategy"}
            },
            {
                "name": "Invalid plan",
                "headers": {"X-User-Id": "test", "X-Plan": "hackerman"},
                "payload": {"question": "Invalid plan", "agent": "ROI"}
            },
            {
                "name": "Empty question",
                "headers": {"X-User-Id": "test", "X-Plan": "free"},
                "payload": {"question": "", "agent": "Emotion"}
            },
            {
                "name": "Invalid agent",
                "headers": {"X-User-Id": "test", "X-Plan": "pro"},
                "payload": {"question": "Test", "agent": "MathRandom"}
            }
        ]
        
        for test in tests:
            print(f"  Testing: {test['name']}...")
            try:
                async with session.post(
                    f"{API_BASE}/ask",
                    headers=test["headers"],
                    json=test["payload"]
                ) as resp:
                    print(f"    Status: {resp.status}")
                    if resp.status != 200:
                        error = await resp.text()
                        print(f"    Response: {error[:100]}...")
            except Exception as e:
                print(f"    Exception: {e}")
                
    async def load_test(self, session: aiohttp.ClientSession):
        """Sustained load test"""
        print("\n💪 LOAD TESTING...")
        
        print("  Simulating realistic traffic (10 users, 100 questions each)...")
        
        async def user_session(user_id: str, plan: str, count: int):
            successes = 0
            errors = 0
            
            for i in range(count):
                headers = {
                    "X-User-Id": f"{user_id}_{i}",
                    "X-Plan": plan,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "question": f"Load test {i+1}",
                    "agent": random.choice(["Strategy", "Emotion", "ROI"])
                }
                
                try:
                    async with session.post(
                        f"{API_BASE}/ask",
                        headers=headers,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as resp:
                        if resp.status in [200, 402, 429]:
                            successes += 1
                        else:
                            errors += 1
                except:
                    errors += 1
                    
                await asyncio.sleep(random.uniform(0.5, 2))  # Realistic pacing
                
            return successes, errors
            
        # Launch concurrent user sessions
        tasks = []
        for i in range(10):
            plan = "pro" if i < 3 else "free"  # Mix of plans
            tasks.append(user_session(f"load_user_{i}", plan, 100))
            
        start = time.time()
        results = await asyncio.gather(*tasks)
        elapsed = time.time() - start
        
        total_success = sum(r[0] for r in results)
        total_errors = sum(r[1] for r in results)
        
        print(f"  ✓ Completed in {elapsed:.2f}s")
        print(f"  Success: {total_success}/1000")
        print(f"  Errors: {total_errors}/1000")
        print(f"  Throughput: {1000/elapsed:.2f} req/s")
        
        self.results["performance"].append({
            "test": "sustained_load",
            "total_requests": 1000,
            "success": total_success,
            "errors": total_errors,
            "time": elapsed,
            "rps": 1000 / elapsed
        })
        
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        
        print(f"\n✓ Successful asks: {len(self.results['successful_asks'])}")
        print(f"💰 Payment required responses: {len(self.results['payment_required'])}")
        print(f"⏱️ Rate limit responses: {len(self.results['rate_limits'])}")
        print(f"✗ Errors: {len(self.results['errors'])}")
        
        if self.results["performance"]:
            print("\n⚡ PERFORMANCE:")
            for perf in self.results["performance"]:
                print(f"  {perf['test']}: {perf['rps']:.2f} req/s")
                
        if self.results["payment_required"]:
            print("\n💰 MONETIZATION WORKING:")
            for pr in self.results["payment_required"][:3]:
                print(f"  User {pr['user']} blocked at question {pr['question']}")
                
        print("\n" + "="*50)
        
async def main():
    """Run all tests"""
    print("🔥 SENTIENTIQ MONETIZATION STRESS TEST 🔥")
    print("="*50)
    
    tester = MonetizationTester()
    
    async with aiohttp.ClientSession() as session:
        # Run tests in sequence to avoid overwhelming
        await tester.test_rate_limiting(session)
        await tester.test_pro_unlimited(session)
        await tester.test_minute_caps(session)
        await tester.test_webhook_simulation(session)
        await tester.test_edge_cases(session)
        await tester.load_test(session)
        
    tester.print_summary()
    
    # Save detailed results
    with open("monetization_test_results.json", "w") as f:
        json.dump(tester.results, f, indent=2, default=str)
        print(f"\n📁 Detailed results saved to monetization_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())