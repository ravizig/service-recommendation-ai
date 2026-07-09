-- ============================================
-- AI Service Recommendation Engine - Database Setup
-- ============================================
-- ============================================
-- SECTION 1: Create Service Table
-- ============================================
CREATE TABLE IF NOT EXISTS "service" (
    "id" character varying NOT NULL,
    "name" text,
    "nameAr" text,
    "description" text,
    "servingTime" integer,
    "isDeleted" boolean DEFAULT FALSE,
    "merchantID" character varying NOT NULL,
    "createdAt" bigint,
    "updatedAt" bigint,
    PRIMARY KEY ("id")
);
-- ============================================
-- SECTION 2: Enable pgvector Extension
-- ============================================
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
-- Verify installation
SELECT extname,
    extversion
FROM pg_extension
WHERE extname = 'vector';
-- ============================================
-- SECTION 3: Add Embedding Columns to Service Table
-- ============================================
-- Add vector embedding column (384 dimensions for sentence-transformers/all-MiniLM-L6-v2)
ALTER TABLE "service"
ADD COLUMN IF NOT EXISTS "embeddingVector" vector(384);
-- Add metadata columns for tracking embedding generation
ALTER TABLE "service"
ADD COLUMN IF NOT EXISTS "embeddingGeneratedAt" bigint;
ALTER TABLE "service"
ADD COLUMN IF NOT EXISTS "embeddingModel" VARCHAR(50) DEFAULT 'sentence-transformers/all-MiniLM-L6-v2';
-- ============================================
-- SECTION 4: Create Indexes for Performance
-- ============================================
-- Create IVFFlat index for vector similarity search
-- Lists parameter = sqrt(total_rows) ≈ 100 for ~1000 services
-- This significantly improves query performance for cosine similarity searches
CREATE INDEX IF NOT EXISTS "idxServiceEmbeddingVector" ON "service" USING ivfflat ("embeddingVector" vector_cosine_ops) WITH (lists = 100);
-- Create index on embedding_generated_at for sync tracking
CREATE INDEX IF NOT EXISTS "idxServiceEmbeddingGeneratedAt" ON "service" ("embeddingGeneratedAt");
-- Create composite index for common queries
-- This optimizes queries that filter by merchant and check for active, non-deleted services
CREATE INDEX IF NOT EXISTS "idxServiceMerchantActive" ON "service" ("merchantID", "isDeleted")
WHERE "isDeleted" = FALSE
    AND "embeddingVector" IS NOT NULL;
-- ============================================
-- SECTION 5: Create Embedding Sync Log Table
-- ============================================
-- Create table to track embedding synchronization history
CREATE TABLE IF NOT EXISTS "embeddingsynclog" (
    "id" character varying NOT NULL,
    "syncStartedAt" bigint,
    "syncCompletedAt" bigint,
    "servicesProcessed" INTEGER DEFAULT 0,
    "servicesUpdated" INTEGER DEFAULT 0,
    "servicesFailed" INTEGER DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'inprogress',
    "errorMessage" TEXT,
    "triggeredBy" VARCHAR(100),
    "createdAt" bigint,
    "updatedAt" bigint,
    PRIMARY KEY ("id")
);
-- ============================================
-- SECTION 6: Verification Queries
-- ============================================
-- Verify pgvector extension
SELECT 'pgvector Extension' as component,
    CASE
        WHEN COUNT(*) > 0 THEN 'Installed'
        ELSE 'Missing'
    END as status
FROM pg_extension
WHERE extname = 'vector';
-- Verify service table columns
SELECT 'Service Table Columns' as component,
    column_name,
    data_type,
    CASE
        WHEN data_type = 'USER-DEFINED' THEN udt_name
        ELSE ''
    END as custom_type
FROM information_schema.columns
WHERE table_name = 'service'
ORDER BY ordinal_position;
-- Verify indexes
SELECT 'Indexes' as component,
    indexname as index_name,
    tablename as table_name
FROM pg_indexes
WHERE tablename IN ('service', 'embeddingsynclog')
    AND indexname LIKE 'idx_%'
ORDER BY tablename,
    indexname;
-- Verify embeddingsynclog table
SELECT 'Embedding Sync Log Table' as component,
    CASE
        WHEN COUNT(*) > 0 THEN 'Created'
        ELSE 'Missing'
    END as status
FROM information_schema.tables
WHERE table_name = 'embeddingsynclog';