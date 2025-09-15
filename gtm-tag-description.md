# SentientIQ Emotion Intelligence System

## Tag Description
Injects SentientIQ's behavioral detection and intervention scripts to track emotional states and trigger contextual interventions based on user behavior patterns.

## What It Does
- **Detects** 20 behavioral signals (rage clicks, exit intent, confusion patterns)
- **Maps** behaviors to 10 emotional states (frustrated, confused, interested, hesitant)
- **Triggers** smart interventions at moments of peak emotional relevance
- **Records** all events for conversion optimization

## Configuration
- **Tenant ID**: Your unique tenant identifier (e.g., 'sidk' for automotive dealership)
- **API Key**: Authentication key for the SentientIQ API

## Scripts Loaded
1. `detect-v4.js` - Behavioral signal detection engine
2. `interventions-v4.js` - Contextual intervention system

## Trigger
All Pages - Scripts initialize on every page load to capture the complete user journey.