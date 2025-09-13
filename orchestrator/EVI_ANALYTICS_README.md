# EVI Analytics - The Bloomberg Terminal of Human Emotion

The EVI (Emotional Volatility Index) Analytics pipeline is SentientIQ's core data infrastructure that transforms every emotion into a permanent, queryable record in the collective business consciousness. This is our proprietary data moat - the first standardized measure of emotional volatility in business contexts.

## Architecture Overview

```
Emotional Events → Event Lake (S3 + Parquet) → Athena Analytics → EVI Dashboard
                         ↓
                    Real-time Batching
                         ↓
                   Partitioned Storage
                  (date/hour/vertical/geography)
```

## Core Components

### 1. Event Lake Service (`event-lake.ts`)
- **S3 + Athena** data pipeline for scalable emotion storage
- **Parquet format** for efficient compression and querying
- **Intelligent partitioning** by date/hour/vertical/geography
- **Real-time streaming** with efficient batching (1000 events or 30s timeout)
- **Production-ready** error handling and monitoring

### 2. EVI Calculator (`evi-calculator.ts`)
- **Proprietary EVI formula** that quantifies emotional volatility (0-100 scale)
- **Multi-dimensional analysis** by vertical, geography, time range
- **Risk assessment** with actionable recommendations
- **Comparative metrics** vs previous periods and industry averages
- **Real-time dashboard** generation

### 3. EVI Query Service (`evi-queries.ts`)
- **Pre-built SQL queries** optimized for Athena
- **Performance-tuned** with proper partitioning
- **Business intelligence** queries for competitive analysis
- **Intervention effectiveness** tracking
- **Customer journey** emotional flow analysis

## Event Schema

Each emotional event captured includes:

```typescript
interface EventLakeRecord {
  // Core identifiers
  timestamp: string;           // ISO 8601 timestamp
  userId: string;             // User identifier  
  companyId: string;          // Company/tenant identifier
  sessionId: string;          // Session identifier
  
  // Classification dimensions
  vertical: string;           // Industry (saas, ecommerce, fintech, etc.)
  geography: string;          // Region (us-east, eu-west, apac, etc.)
  
  // Emotional data
  emotion: string;            // Detected emotion
  confidence: number;         // Detection confidence (0-100)
  intensity: number;          // Emotional intensity (0-100)
  
  // Business context
  dollarValue: number;        // Associated revenue/potential
  interventionTaken: boolean; // Whether intervention triggered
  outcome: string;            // Actual outcome (purchase, abandon, etc.)
  
  // Technical context + metadata
  pageUrl: string;           
  elementTarget?: string;    
  userAgent: string;         
  metadata: {...}            // Device, platform, campaign data
}
```

## EVI Formula

The EVI (Emotional Volatility Index) uses a weighted combination:

```
EVI = sqrt(
  (intensity_variance * 0.25) +           // Emotional variance
  (emotion_diversity * 0.20) +            // Breadth of emotions  
  (temporal_volatility * 0.30) +          // Changes over time
  (intervention_rate * 0.15) +            // Business impact
  (confidence_penalty * 0.10)             // Uncertainty penalty
) * 100
```

**Risk Levels:**
- **0-30**: Low risk (stable emotional state)
- **30-50**: Medium risk (monitor closely) 
- **50-70**: High risk (proactive intervention needed)
- **70-100**: Critical risk (emergency response required)

## API Endpoints

### Core Emotional Analytics
- `POST /api/emotional/event` - Record emotional event (auto-routes to Event Lake)
- `GET /api/emotional/patterns` - Historical emotional patterns
- `GET /api/emotional/heatmap` - Emotional heatmap for pages
- `POST /api/emotional/predict` - Predict next user action
- `GET /api/emotional/funnel` - Emotional conversion funnel

### EVI Analytics (New)
- `GET /api/evi/calculate` - Calculate EVI for time range/filters
- `GET /api/evi/dashboard` - Complete EVI dashboard with breakdowns
- `GET /api/evi/stats` - Event Lake statistics and metrics
- `POST /api/evi/initialize` - Initialize Athena tables (admin)
- `POST /api/evi/flush` - Flush pending batches (admin)

### Sample API Calls

#### Calculate EVI
```bash
curl "http://localhost:8787/api/evi/calculate?startDate=2024-01-01T00:00:00Z&endDate=2024-01-07T23:59:59Z&vertical=saas&geography=us-east"
```

#### Get EVI Dashboard
```bash
curl "http://localhost:8787/api/evi/dashboard?startDate=2024-01-01T00:00:00Z&endDate=2024-01-07T23:59:59Z&companyId=demo-company"
```

#### Record Emotional Event
```bash
curl -X POST http://localhost:8787/api/emotional/event \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_123",
    "user_id": "user_456", 
    "tenant_id": "company_789",
    "timestamp": "2024-01-15T10:30:00Z",
    "emotion": "frustration",
    "confidence": 87,
    "intensity": 65,
    "predicted_action": "abandon_cart",
    "intervention_window": 30,
    "page_url": "https://example.com/checkout",
    "element_target": "#payment-form",
    "micro_behaviors": [],
    "metadata": {
      "vertical": "ecommerce",
      "geography": "us-east", 
      "dollarValue": 299.99,
      "deviceType": "desktop",
      "platform": "web",
      "userAgent": "Mozilla/5.0..."
    }
  }'
```

## Configuration

### Environment Variables (.env)
```bash
# AWS Configuration for Event Lake
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
EVENT_LAKE_BUCKET=sentientiq-event-lake
ATHENA_WORKGROUP=primary
```

### AWS Setup Required

1. **S3 Bucket**: Create bucket for event storage
2. **Athena Workgroup**: Configure query workgroup  
3. **IAM Permissions**: S3 read/write, Athena query execution
4. **Initial Table Setup**: Run `/api/evi/initialize` endpoint

## Partitioning Strategy

Data is partitioned for optimal query performance:

```
s3://sentientiq-event-lake/
  year=2024/
    month=01/
      day=15/
        hour=10/
          vertical=saas/
            geography=us-east/
              batch_uuid.parquet
```

This enables efficient queries like:
- "Show me EVI for SaaS companies in US-East for the past week"
- "Compare emotional volatility across geographies for Q4"
- "Alert on any vertical with EVI > 60 in the last hour"

## Data Moat Benefits

1. **Proprietary Insights**: First-mover advantage in emotional business intelligence
2. **Competitive Benchmarking**: Industry averages and percentile rankings
3. **Predictive Analytics**: Emotion → revenue correlation models
4. **Real-time Alerts**: Proactive intervention triggering
5. **Historical Analysis**: Long-term emotional trend analysis
6. **Customer Journey**: Complete emotional flow mapping

## Monitoring & Observability

- **Real-time metrics**: Batch processing, error rates, EVI alerts
- **CloudWatch integration**: AWS native monitoring
- **Custom dashboards**: EVI trends, intervention effectiveness
- **Alert thresholds**: Configurable EVI risk levels

## Production Deployment

1. Set up AWS infrastructure (S3, Athena, IAM)
2. Configure environment variables
3. Initialize Event Lake tables: `POST /api/evi/initialize`
4. Start receiving emotional events via existing `/api/emotional/event`
5. Query EVI dashboard: `GET /api/evi/dashboard`

## Future Enhancements

- **Machine Learning**: Predictive EVI models
- **Real-time Streaming**: Kinesis/Lambda integration
- **Advanced Partitioning**: Company-level partitions for multi-tenancy
- **Data Catalog**: AWS Glue integration for schema management
- **Cost optimization**: Intelligent archiving and compression

---

The EVI Analytics system transforms raw emotional data into the most valuable business intelligence asset of the digital age. Every emotion becomes a permanent record in our collective business consciousness, creating an unassailable data moat that compounds with every interaction.