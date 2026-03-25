-- Migration: Add m4 and m5 columns to measurements table
-- Created: 2026-03-25
-- Purpose: Add missing measurement columns m4 and m5 that exist in the model but not in DB

ALTER TABLE measurements
    ADD COLUMN IF NOT EXISTS m4 FLOAT,
    ADD COLUMN IF NOT EXISTS m5 FLOAT;
