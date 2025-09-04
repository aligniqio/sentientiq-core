-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Senders reputation table
CREATE TABLE spam_senders (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    linkedin_id VARCHAR(255),
    name VARCHAR(255),
    company VARCHAR(255),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    total_messages INT DEFAULT 1,
    bullshit_score_avg FLOAT DEFAULT 0,
    manipulation_score_avg FLOAT DEFAULT 0,
    nicknames TEXT[], -- Dr. Brutal's nicknames for repeat offenders
    inside_jokes TEXT[], -- Accumulated jokes about this sender
    favorite_tactics TEXT[], -- Their go-to manipulation tactics
    template_signatures TEXT[], -- Identified templates they use
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages analysis history
CREATE TABLE analyzed_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES spam_senders(id),
    message_text TEXT NOT NULL,
    message_vector vector(1536), -- OpenAI embeddings dimension
    
    -- Analysis results
    authenticity_score INT,
    manipulation_score INT,
    template_likelihood INT,
    fake_urgency BOOLEAN,
    impossible_claims BOOLEAN,
    
    -- Dr. Brutal's response
    brutal_truth TEXT,
    recommendation TEXT,
    exposed_function TEXT,
    sarcasm_level INT, -- 1-10, increases with repeat offenders
    
    -- Detected patterns
    tactics_detected JSONB,
    bullshit_phrases TEXT[],
    
    -- Context
    source VARCHAR(50), -- 'linkedin', 'email', 'other'
    thread_id VARCHAR(255),
    is_followup BOOLEAN DEFAULT FALSE,
    
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template patterns table (for recognizing variations)
CREATE TABLE spam_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255),
    template_vector vector(1536),
    pattern_signature TEXT,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    times_seen INT DEFAULT 1,
    avg_bullshit_score FLOAT,
    typical_tactics JSONB,
    dr_brutal_nickname VARCHAR(255), -- "The 10x Growth Special", "Nigerian Prince 2.0"
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track relationships between messages (threads/campaigns)
CREATE TABLE message_relationships (
    id SERIAL PRIMARY KEY,
    parent_message_id INT REFERENCES analyzed_messages(id),
    child_message_id INT REFERENCES analyzed_messages(id),
    relationship_type VARCHAR(50), -- 'followup', 'variation', 'campaign'
    days_between INT,
    desperation_increase FLOAT, -- How much more desperate did they get?
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dr. Brutal's learned insights
CREATE TABLE brutal_insights (
    id SERIAL PRIMARY KEY,
    insight_type VARCHAR(50), -- 'pattern', 'joke', 'observation'
    insight_text TEXT,
    related_sender_id INT REFERENCES spam_senders(id),
    related_template_id INT REFERENCES spam_templates(id),
    times_used INT DEFAULT 0,
    effectiveness_score FLOAT, -- How savage was this comeback?
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_senders_email ON spam_senders(email);
CREATE INDEX idx_senders_linkedin ON spam_senders(linkedin_id);
CREATE INDEX idx_messages_vector ON analyzed_messages USING ivfflat (message_vector vector_cosine_ops);
CREATE INDEX idx_templates_vector ON spam_templates USING ivfflat (template_vector vector_cosine_ops);
CREATE INDEX idx_messages_sender ON analyzed_messages(sender_id);
CREATE INDEX idx_messages_analyzed_at ON analyzed_messages(analyzed_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spam_senders_updated_at
    BEFORE UPDATE ON spam_senders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample queries Dr. Brutal would use:

-- Find similar messages to identify templates
-- SELECT id, message_text, 1 - (message_vector <=> $1::vector) as similarity
-- FROM analyzed_messages
-- WHERE 1 - (message_vector <=> $1::vector) > 0.8
-- ORDER BY similarity DESC;

-- Get sender history with escalating sarcasm
-- SELECT s.*, array_agg(m.brutal_truth ORDER BY m.analyzed_at) as brutal_history
-- FROM spam_senders s
-- JOIN analyzed_messages m ON s.id = m.sender_id
-- WHERE s.email = $1
-- GROUP BY s.id;

-- Track template evolution
-- SELECT t.*, COUNT(DISTINCT m.sender_id) as unique_senders
-- FROM spam_templates t
-- JOIN analyzed_messages m ON 1 - (m.message_vector <=> t.template_vector) > 0.85
-- GROUP BY t.id
-- ORDER BY t.times_seen DESC;