"""
Usage Limiter Middleware for SentientIQ
Enforces tier-based rate limits with pluggable storage
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Tier definitions
TIERS = {
    "free": {"questions_per_month": 20, "api_calls_per_month": 0},
    "pro": {"questions_per_month": -1, "api_calls_per_month": 0},  # -1 = unlimited
    "team": {"questions_per_month": -1, "api_calls_per_month": 1000},
    "enterprise": {"questions_per_month": -1, "api_calls_per_month": -1},
}

class UsageStore:
    """Base class for usage storage backends"""
    
    async def get_usage(self, user_id: str) -> Dict:
        raise NotImplementedError
    
    async def increment_usage(self, user_id: str, action: str) -> Dict:
        raise NotImplementedError
    
    async def reset_if_needed(self, user_id: str, usage: Dict) -> Dict:
        raise NotImplementedError

class InMemoryStore(UsageStore):
    """In-memory storage for development"""
    
    def __init__(self):
        self.data = {}
    
    async def get_usage(self, user_id: str) -> Dict:
        if user_id not in self.data:
            self.data[user_id] = {
                "questions_this_month": 0,
                "api_calls_this_month": 0,
                "last_reset": datetime.now().isoformat(),
                "month_year": f"{datetime.now().month}-{datetime.now().year}"
            }
        return self.data[user_id]
    
    async def increment_usage(self, user_id: str, action: str) -> Dict:
        usage = await self.get_usage(user_id)
        usage = await self.reset_if_needed(user_id, usage)
        
        if action == "question":
            usage["questions_this_month"] += 1
        elif action == "api_call":
            usage["api_calls_this_month"] += 1
        
        self.data[user_id] = usage
        return usage
    
    async def reset_if_needed(self, user_id: str, usage: Dict) -> Dict:
        current_month = f"{datetime.now().month}-{datetime.now().year}"
        if usage.get("month_year") != current_month:
            # New month, reset counters
            usage = {
                "questions_this_month": 0,
                "api_calls_this_month": 0,
                "last_reset": datetime.now().isoformat(),
                "month_year": current_month
            }
            self.data[user_id] = usage
        return usage

class DynamoDBStore(UsageStore):
    """DynamoDB storage for production (serverless-friendly)"""
    
    def __init__(self, table_name="sentientiq-usage"):
        import boto3
        self.table = boto3.resource('dynamodb').Table(table_name)
    
    async def get_usage(self, user_id: str) -> Dict:
        try:
            response = self.table.get_item(Key={'user_id': user_id})
            if 'Item' in response:
                return response['Item']
            else:
                # Initialize new user
                usage = {
                    "user_id": user_id,
                    "questions_this_month": 0,
                    "api_calls_this_month": 0,
                    "last_reset": datetime.now().isoformat(),
                    "month_year": f"{datetime.now().month}-{datetime.now().year}"
                }
                self.table.put_item(Item=usage)
                return usage
        except Exception as e:
            logger.error(f"DynamoDB get error: {e}")
            return {"questions_this_month": 0, "api_calls_this_month": 0}
    
    async def increment_usage(self, user_id: str, action: str) -> Dict:
        usage = await self.get_usage(user_id)
        usage = await self.reset_if_needed(user_id, usage)
        
        try:
            if action == "question":
                response = self.table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='ADD questions_this_month :inc',
                    ExpressionAttributeValues={':inc': 1},
                    ReturnValues='ALL_NEW'
                )
            elif action == "api_call":
                response = self.table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='ADD api_calls_this_month :inc',
                    ExpressionAttributeValues={':inc': 1},
                    ReturnValues='ALL_NEW'
                )
            return response.get('Attributes', usage)
        except Exception as e:
            logger.error(f"DynamoDB increment error: {e}")
            return usage
    
    async def reset_if_needed(self, user_id: str, usage: Dict) -> Dict:
        current_month = f"{datetime.now().month}-{datetime.now().year}"
        if usage.get("month_year") != current_month:
            # New month, reset counters
            usage = {
                "user_id": user_id,
                "questions_this_month": 0,
                "api_calls_this_month": 0,
                "last_reset": datetime.now().isoformat(),
                "month_year": current_month
            }
            self.table.put_item(Item=usage)
        return usage

class UsageLimiter:
    """Main usage limiting middleware"""
    
    def __init__(self, store: Optional[UsageStore] = None, bypass_for_tests=False):
        self.store = store or InMemoryStore()
        self.bypass = bypass_for_tests
    
    def get_user_tier(self, request: Request) -> Tuple[str, str]:
        """Extract user ID and tier from request (Clerk or headers)"""
        
        # Try Clerk session first
        if hasattr(request.state, "user"):
            user = request.state.user
            return (
                user.get("id", "anonymous"),
                user.get("publicMetadata", {}).get("tier", "free")
            )
        
        # Fall back to headers (for testing or alternative auth)
        user_id = request.headers.get("X-User-Id", "anonymous")
        tier = request.headers.get("X-User-Tier", "free")
        
        return user_id, tier
    
    async def check_limit(self, request: Request, action: str = "question") -> Optional[Response]:
        """Check if user has exceeded their limits"""
        
        if self.bypass:
            return None
        
        user_id, tier = self.get_user_tier(request)
        
        # Unknown tier defaults to free
        if tier not in TIERS:
            tier = "free"
        
        limits = TIERS[tier]
        
        # Check the limit for this action
        if action == "question":
            limit = limits["questions_per_month"]
        elif action == "api_call":
            limit = limits["api_calls_per_month"]
        else:
            return None
        
        # Unlimited (-1) means no checking needed
        if limit == -1:
            return None
        
        # Get current usage
        usage = await self.store.get_usage(user_id)
        
        # Check if limit exceeded
        current_usage = usage.get(f"{action}s_this_month", 0)
        
        if current_usage >= limit:
            # Return 429 with helpful message
            return JSONResponse(
                status_code=429,
                content={
                    "error": "usage_limit_exceeded",
                    "message": f"Monthly limit reached ({current_usage}/{limit} {action}s)",
                    "tier": tier,
                    "limit": limit,
                    "used": current_usage,
                    "reset_date": self._get_next_reset_date(),
                    "upgrade_url": "/pricing"
                }
            )
        
        # Increment usage
        await self.store.increment_usage(user_id, action)
        
        # Add usage headers to response
        request.state.usage_headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(limit - current_usage - 1),
            "X-RateLimit-Reset": self._get_next_reset_date()
        }
        
        return None
    
    def _get_next_reset_date(self) -> str:
        """Calculate next month's reset date"""
        now = datetime.now()
        if now.month == 12:
            next_reset = datetime(now.year + 1, 1, 1)
        else:
            next_reset = datetime(now.year, now.month + 1, 1)
        return next_reset.isoformat()
    
    async def __call__(self, request: Request, call_next):
        """Middleware entry point"""
        
        # Only check limits on specific endpoints
        if request.url.path == "/ask" and request.method == "POST":
            limit_response = await self.check_limit(request, "question")
            if limit_response:
                return limit_response
        
        elif request.url.path.startswith("/api/") and request.method in ["GET", "POST"]:
            limit_response = await self.check_limit(request, "api_call")
            if limit_response:
                return limit_response
        
        # Process request
        response = await call_next(request)
        
        # Add usage headers if available
        if hasattr(request.state, "usage_headers"):
            for header, value in request.state.usage_headers.items():
                response.headers[header] = value
        
        return response

# Initialize based on environment
def create_limiter(storage_type: str = "memory") -> UsageLimiter:
    """Factory function to create appropriate limiter"""
    
    if storage_type == "dynamodb":
        store = DynamoDBStore()
    else:
        store = InMemoryStore()
    
    return UsageLimiter(store)

# Usage in FastAPI app:
# 
# from usage_limiter import create_limiter
#
# app = FastAPI()
# limiter = create_limiter(os.getenv("STORAGE_TYPE", "memory"))
# app.add_middleware(limiter)