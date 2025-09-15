/**
 * Event Lake Service - S3 + Athena Event Analytics Pipeline
 * 
 * This is the core data infrastructure for the EVI (Emotional Volatility Index) data moat.
 * Every emotion becomes a permanent record in the collective business consciousness.
 * The Bloomberg Terminal of human emotion.
 * 
 * Architecture:
 * - Real-time event streaming to S3 in Parquet format
 * - Partitioned by date/hour/vertical/geography for efficient querying
 * - Athena for ad-hoc analytics and EVI calculations
 * - Batching for cost efficiency and performance
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from '@aws-sdk/client-athena';
import * as crypto from 'crypto';
import { getDeploymentConfig } from '../config/deployment-mode.js';
import { stubDataLake } from './pipeline-stubs.js';

// Event schema for the data lake
export interface EventLakeRecord {
  // Core identifiers
  timestamp: string;           // ISO 8601 timestamp
  userId: string;             // User identifier
  companyId: string;          // Company/tenant identifier
  sessionId: string;          // Session identifier
  
  // Classification dimensions
  vertical: string;           // Industry vertical (saas, ecommerce, fintech, healthcare, etc.)
  geography: string;          // Geographic region (us-east, eu-west, apac, etc.)
  
  // Emotional data
  emotion: string;            // Detected emotion
  confidence: number;         // Detection confidence (0-100)
  intensity: number;          // Emotional intensity (0-100)
  
  // Business context
  dollarValue: number;        // Associated dollar value/potential revenue
  interventionTaken: boolean; // Whether an intervention was triggered
  outcome: string;            // Actual outcome (purchase, abandon, support, etc.)
  
  // Technical context
  pageUrl: string;           // Page where emotion was detected
  elementTarget?: string;    // Specific element that triggered the emotion
  userAgent: string;         // Browser/device information
  
  // Metadata
  metadata: {
    deviceType: string;      // desktop, mobile, tablet
    platform: string;       // web, ios, android
    campaignId?: string;     // Marketing campaign ID
    referrer?: string;       // Traffic source
    customFields?: Record<string, any>; // Extensible custom data
  };
}

export interface EventBatch {
  records: EventLakeRecord[];
  batchId: string;
  timestamp: string;
  partition: {
    year: string;
    month: string;
    day: string;
    hour: string;
    vertical: string;
    geography: string;
  };
}

export class EventLakeService {
  private s3Client: S3Client | null = null;
  private athenaClient: AthenaClient | null = null;
  private bucketName: string;
  private batchBuffer: Map<string, EventLakeRecord[]> = new Map();
  private batchSize: number;
  private batchTimeout: number;
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private useStubs: boolean;

  constructor() {
    const config = getDeploymentConfig();
    this.useStubs = config.infrastructure.useStubs;
    this.batchSize = config.infrastructure.batchSize;
    this.batchTimeout = config.infrastructure.flushIntervalMs;
    this.bucketName = process.env.EVENT_LAKE_BUCKET || 'sentientiq-event-lake';

    if (!this.useStubs && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      // Initialize AWS services only if credentials are available and not in stub mode
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      this.athenaClient = new AthenaClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      console.log('🗄️  EventLake initialized (S3/Athena mode):', {
        bucket: this.bucketName,
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout
      });
    } else {
      console.log('🧪 EventLake initialized (stub mode):', {
        stubBackend: 'supabase',
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout,
        reason: this.useStubs ? 'deployment config' : 'missing AWS credentials'
      });
    }
  }

  /**
   * Generate partition key for efficient querying
   */
  private generatePartitionKey(record: EventLakeRecord): string {
    const date = new Date(record.timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    
    return `year=${year}/month=${month}/day=${day}/hour=${hour}/vertical=${record.vertical}/geography=${record.geography}`;
  }

  /**
   * Create partition info from record
   */
  private createPartitionInfo(record: EventLakeRecord) {
    const date = new Date(record.timestamp);
    return {
      year: String(date.getUTCFullYear()),
      month: String(date.getUTCMonth() + 1).padStart(2, '0'),
      day: String(date.getUTCDate()).padStart(2, '0'),
      hour: String(date.getUTCHours()).padStart(2, '0'),
      vertical: record.vertical,
      geography: record.geography
    };
  }

  /**
   * Add event to batch buffer for efficient processing
   */
  async addEvent(record: EventLakeRecord): Promise<void> {
    try {
      // Validate required fields
      this.validateRecord(record);
      
      // If using stubs, delegate to stub service
      if (this.useStubs || !this.s3Client) {
        await stubDataLake.addEvent(record);
        return;
      }
      
      // Generate partition key
      const partitionKey = this.generatePartitionKey(record);
      
      // Add to batch buffer
      if (!this.batchBuffer.has(partitionKey)) {
        this.batchBuffer.set(partitionKey, []);
      }
      
      const batch = this.batchBuffer.get(partitionKey)!;
      batch.push(record);
      
      console.log(`📊 Event added to batch: ${record.emotion} (${partitionKey}) - Batch size: ${batch.length}`);
      
      // Check if batch is ready to flush
      if (batch.length >= this.batchSize) {
        await this.flushBatch(partitionKey);
      } else {
        // Set timeout for batch flush if not already set
        if (!this.batchTimeouts.has(partitionKey)) {
          const timeout = setTimeout(() => {
            this.flushBatch(partitionKey).catch(console.error);
            this.batchTimeouts.delete(partitionKey);
          }, this.batchTimeout);
          
          this.batchTimeouts.set(partitionKey, timeout);
        }
      }
    } catch (error) {
      console.error('❌ Failed to add event to lake:', error);
      // Don't throw in stub mode to prevent breaking core flows
      if (!this.useStubs) {
        throw error;
      }
    }
  }

  /**
   * Validate event record
   */
  private validateRecord(record: EventLakeRecord): void {
    const required = ['timestamp', 'userId', 'companyId', 'sessionId', 'vertical', 'geography', 'emotion', 'confidence'];
    
    for (const field of required) {
      if (!(field in record) || record[field as keyof EventLakeRecord] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate ranges
    if (record.confidence < 0 || record.confidence > 100) {
      throw new Error('Confidence must be between 0-100');
    }
    
    if (record.intensity < 0 || record.intensity > 100) {
      throw new Error('Intensity must be between 0-100');
    }
    
    // Validate timestamp
    if (isNaN(new Date(record.timestamp).getTime())) {
      throw new Error('Invalid timestamp format');
    }
  }

  /**
   * Flush batch to S3 in Parquet format
   */
  private async flushBatch(partitionKey: string): Promise<void> {
    const batch = this.batchBuffer.get(partitionKey);
    if (!batch || batch.length === 0) return;
    
    try {
      console.log(`🚀 Flushing batch: ${partitionKey} with ${batch.length} records`);
      
      // Clear timeout
      const timeout = this.batchTimeouts.get(partitionKey);
      if (timeout) {
        clearTimeout(timeout);
        this.batchTimeouts.delete(partitionKey);
      }
      
      // Create batch object
      const eventBatch: EventBatch = {
        records: [...batch],
        batchId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        partition: this.createPartitionInfo(batch[0])
      };
      
      // Convert to Parquet format (simplified - in production you'd use proper Parquet library)
      const parquetData = this.convertToParquet(eventBatch);
      
      // Generate S3 key
      const s3Key = `${partitionKey}/batch_${eventBatch.batchId}.parquet`;
      
      // Upload to S3
      await this.s3Client!.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: parquetData,
        ContentType: 'application/octet-stream',
        Metadata: {
          'batch-id': eventBatch.batchId,
          'record-count': String(batch.length),
          'partition': partitionKey,
          'timestamp': eventBatch.timestamp
        }
      }));
      
      console.log(`✅ Batch uploaded to S3: s3://${this.bucketName}/${s3Key}`);
      
      // Clear the batch
      this.batchBuffer.delete(partitionKey);
      
      // Update metrics
      await this.updateMetrics(eventBatch);
      
    } catch (error) {
      console.error(`❌ Failed to flush batch ${partitionKey}:`, error);
      // Don't clear the batch on failure - it will retry later
      throw error;
    }
  }

  /**
   * Convert event batch to Parquet format
   * Note: In production, use a proper Parquet library like parquet-wasm or apache-parquet
   */
  private convertToParquet(batch: EventBatch): Buffer {
    // Simplified Parquet conversion - in production use proper Parquet library
    // This is a JSON representation for now, but would be binary Parquet format
    const parquetData = {
      schema: {
        timestamp: 'TIMESTAMP',
        userId: 'STRING',
        companyId: 'STRING', 
        sessionId: 'STRING',
        vertical: 'STRING',
        geography: 'STRING',
        emotion: 'STRING',
        confidence: 'DOUBLE',
        intensity: 'DOUBLE',
        dollarValue: 'DOUBLE',
        interventionTaken: 'BOOLEAN',
        outcome: 'STRING',
        pageUrl: 'STRING',
        elementTarget: 'STRING',
        userAgent: 'STRING',
        metadata: 'STRING'
      },
      data: batch.records.map(record => ({
        ...record,
        metadata: JSON.stringify(record.metadata)
      }))
    };
    
    return Buffer.from(JSON.stringify(parquetData));
  }

  /**
   * Update metrics for monitoring
   */
  private async updateMetrics(batch: EventBatch): Promise<void> {
    try {
      // In production, send metrics to CloudWatch or similar
      console.log(`📈 Metrics updated:`, {
        batchId: batch.batchId,
        recordCount: batch.records.length,
        partition: batch.partition,
        avgConfidence: batch.records.reduce((sum, r) => sum + r.confidence, 0) / batch.records.length,
        emotionDistribution: this.getEmotionDistribution(batch.records)
      });
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }

  /**
   * Get emotion distribution for metrics
   */
  private getEmotionDistribution(records: EventLakeRecord[]): Record<string, number> {
    return records.reduce((dist, record) => {
      dist[record.emotion] = (dist[record.emotion] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
  }

  /**
   * Force flush all pending batches
   */
  async flushAllBatches(): Promise<void> {
    // If using stubs, delegate to stub service
    if (this.useStubs || !this.s3Client) {
      await stubDataLake.flush();
      return;
    }
    
    const partitionKeys = Array.from(this.batchBuffer.keys());
    console.log(`🔄 Force flushing ${partitionKeys.length} pending batches`);
    
    await Promise.all(
      partitionKeys.map(key => this.flushBatch(key))
    );
  }

  /**
   * Execute Athena query
   */
  async executeAthenaQuery(query: string, outputLocation?: string): Promise<any[]> {
    try {
      // If using stubs, delegate to stub service
      if (this.useStubs || !this.athenaClient) {
        console.log('🧪 Delegating query to stub service');
        return await stubDataLake.executeQuery(query);
      }
      
      const queryOutput = outputLocation || `s3://${this.bucketName}/athena-results/`;
      
      console.log('🔍 Executing Athena query:', query.substring(0, 100) + '...');
      
      // Start query execution
      const { QueryExecutionId } = await this.athenaClient.send(
        new StartQueryExecutionCommand({
          QueryString: query,
          ResultConfiguration: {
            OutputLocation: queryOutput
          },
          WorkGroup: process.env.ATHENA_WORKGROUP || 'primary'
        })
      );

      if (!QueryExecutionId) {
        throw new Error('Failed to start query execution');
      }

      // Wait for query completion
      let queryStatus = 'RUNNING';
      while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { QueryExecution } = await this.athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId })
        );
        
        queryStatus = QueryExecution?.Status?.State || 'UNKNOWN';
        
        if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
          const reason = QueryExecution?.Status?.StateChangeReason;
          throw new Error(`Query failed: ${reason}`);
        }
      }

      // Get query results
      const { ResultSet } = await this.athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId })
      );

      if (!ResultSet?.Rows) {
        return [];
      }

      // Parse results
      const columns = ResultSet.Rows[0]?.Data?.map(col => col.VarCharValue || '') || [];
      const results = ResultSet.Rows.slice(1).map(row => {
        const result: Record<string, any> = {};
        row.Data?.forEach((cell, index) => {
          result[columns[index]] = cell.VarCharValue;
        });
        return result;
      });

      console.log(`✅ Athena query completed: ${results.length} rows returned`);
      return results;
      
    } catch (error) {
      console.error('❌ Athena query failed:', error);
      // In stub mode, return empty results instead of throwing
      if (this.useStubs || !this.athenaClient) {
        console.log('🧪 Returning empty results due to stub mode');
        return [];
      }
      throw error;
    }
  }

  /**
   * Create Athena table for event data
   */
  async createEventTable(): Promise<void> {
    const createTableSQL = `
      CREATE EXTERNAL TABLE IF NOT EXISTS event_lake_emotions (
        timestamp timestamp,
        userId string,
        companyId string,
        sessionId string,
        vertical string,
        geography string,
        emotion string,
        confidence double,
        intensity double,
        dollarValue double,
        interventionTaken boolean,
        outcome string,
        pageUrl string,
        elementTarget string,
        userAgent string,
        metadata string
      )
      PARTITIONED BY (
        year string,
        month string,
        day string,
        hour string,
        vertical_partition string,
        geography_partition string
      )
      STORED AS PARQUET
      LOCATION 's3://${this.bucketName}/'
      TBLPROPERTIES (
        'projection.enabled' = 'true',
        'projection.year.type' = 'integer',
        'projection.year.range' = '2024,2030',
        'projection.month.type' = 'integer', 
        'projection.month.range' = '01,12',
        'projection.month.digits' = '2',
        'projection.day.type' = 'integer',
        'projection.day.range' = '01,31', 
        'projection.day.digits' = '2',
        'projection.hour.type' = 'integer',
        'projection.hour.range' = '00,23',
        'projection.hour.digits' = '2',
        'projection.vertical_partition.type' = 'enum',
        'projection.vertical_partition.values' = 'saas,ecommerce,fintech,healthcare,education,media,gaming,travel,retail,other',
        'projection.geography_partition.type' = 'enum', 
        'projection.geography_partition.values' = 'us-east,us-west,eu-west,eu-central,apac,other',
        'storage.location.template' = 's3://${this.bucketName}/year=\${year}/month=\${month}/day=\${day}/hour=\${hour}/vertical=\${vertical_partition}/geography=\${geography_partition}'
      )
    `;

    await this.executeAthenaQuery(createTableSQL);
    console.log('✅ Athena table created: event_lake_emotions');
  }

  /**
   * Get data lake statistics
   */
  async getDataLakeStats(timeRange?: { start: Date; end: Date }): Promise<any> {
    let whereClause = '';
    if (timeRange) {
      whereClause = `WHERE timestamp BETWEEN timestamp '${timeRange.start.toISOString()}' AND timestamp '${timeRange.end.toISOString()}'`;
    }

    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT userId) as unique_users,
        COUNT(DISTINCT companyId) as unique_companies,
        COUNT(DISTINCT sessionId) as unique_sessions,
        AVG(confidence) as avg_confidence,
        AVG(intensity) as avg_intensity,
        SUM(dollarValue) as total_dollar_value,
        emotion,
        vertical,
        geography,
        COUNT(*) as event_count
      FROM event_lake_emotions 
      ${whereClause}
      GROUP BY emotion, vertical, geography
      ORDER BY event_count DESC
    `;

    return await this.executeAthenaQuery(query);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down EventLake service...');
    
    // Flush all pending batches
    await this.flushAllBatches();
    
    // Clear all timeouts
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();
    
    console.log('✅ EventLake service shutdown complete');
  }
}

// Singleton instance
export const eventLakeService = new EventLakeService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await eventLakeService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await eventLakeService.shutdown();
  process.exit(0);
});