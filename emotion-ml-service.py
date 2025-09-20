#!/usr/bin/env python3
"""
Behavioral ML Service - The Intelligence Layer

Learns from telemetry patterns to understand individual visitor behavior.
Runs alongside the current emotion processor, adding ML-powered insights.

This is what makes Elmo different from Jessie-May.
"""

import asyncio
import json
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Tuple, Optional

import nats
from nats.errors import ConnectionClosedError, TimeoutError

# ML imports
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.cluster import DBSCAN
from scipy import stats
import warnings
warnings.filterwarnings('ignore')


class BehavioralFeatureExtractor:
    """Transforms raw telemetry into ML features"""

    def __init__(self):
        self.window_size = 20  # Last N events to consider
        self.feature_cache = {}

    def extract_features(self, events: List[dict]) -> Dict[str, float]:
        """Extract behavioral features from event sequence"""

        if len(events) < 3:
            return self._empty_features()

        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(events)

        features = {}

        # Time-based features
        features['session_duration'] = self._calculate_duration(df)
        features['event_frequency'] = len(df) / max(features['session_duration'], 1)
        features['idle_ratio'] = self._calculate_idle_ratio(df)

        # Mouse movement patterns
        mouse_events = df[df['type'].str.contains('mouse', na=False)]
        if len(mouse_events) > 0:
            features['avg_mouse_velocity'] = self._safe_mean(mouse_events, 'velocity')
            features['velocity_variance'] = self._safe_std(mouse_events, 'velocity')
            features['acceleration_spikes'] = self._count_spikes(mouse_events, 'acceleration')
            features['movement_entropy'] = self._calculate_entropy(mouse_events)

        # Scroll patterns
        scroll_events = df[df['type'] == 'scroll']
        if len(scroll_events) > 0:
            features['scroll_depth'] = self._safe_max(scroll_events, 'scrollPercentage')
            features['scroll_velocity'] = self._safe_mean(scroll_events, 'scrollSpeed')
            features['scroll_reversals'] = self._count_reversals(scroll_events)
            features['reading_pattern'] = self._detect_reading_pattern(scroll_events)

        # Interaction patterns
        features['rage_click_count'] = len(df[df['type'] == 'rage_click'])
        features['circular_motions'] = len(df[df['type'] == 'circular_motion'])
        features['direction_changes'] = len(df[df['type'] == 'direction_changes'])
        features['text_selection'] = len(df[df['type'] == 'text_selection'])
        features['tab_switch'] = len(df[df['type'] == 'tab_switch'])  # Added for comparison detection

        # Proximity patterns (KEY for intent detection)
        features['price_proximity_time'] = self._calculate_proximity_time(df, 'price_proximity')
        features['cta_proximity_time'] = self._calculate_proximity_time(df, 'cta_proximity')
        features['form_proximity_time'] = self._calculate_proximity_time(df, 'form_proximity')
        features['nav_proximity_time'] = self._calculate_proximity_time(df, 'nav_proximity')

        # Exit signals
        features['exit_signal_strength'] = self._calculate_exit_strength(df)
        features['viewport_approaches'] = len(df[df['type'] == 'viewport_approach'])

        # Behavioral complexity
        features['unique_event_types'] = df['type'].nunique()
        features['pattern_complexity'] = self._calculate_complexity(df)

        # Hesitation patterns
        features['micro_hesitations'] = self._detect_hesitations(df)
        features['dwell_time_variance'] = self._calculate_dwell_variance(df)

        # CRITICAL COMBINATION PATTERNS
        features['mouse_exit_after_idle'] = self._detect_exit_after_idle(df)
        features['price_hover_duration'] = self._calculate_price_hover_duration(df)
        features['confident_scroll_rate'] = self._calculate_confident_scrolling(df)
        features['comparison_pattern_strength'] = self._detect_comparison_behavior(df)

        return features

    def _empty_features(self) -> Dict[str, float]:
        """Return zero-valued features for new sessions"""
        return defaultdict(float)

    def _calculate_duration(self, df: pd.DataFrame) -> float:
        """Calculate session duration in seconds"""
        if 'timestamp' in df.columns and len(df) > 1:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            return (df['timestamp'].max() - df['timestamp'].min()).total_seconds()
        return 0

    def _calculate_idle_ratio(self, df: pd.DataFrame) -> float:
        """Ratio of idle time to active time"""
        idle_events = len(df[df['type'] == 'idle'])
        total_events = len(df)
        return idle_events / max(total_events, 1)

    def _safe_mean(self, df: pd.DataFrame, column: str) -> float:
        """Safely extract mean from nested data"""
        try:
            values = df['data'].apply(lambda x: x.get(column, 0) if isinstance(x, dict) else 0)
            return values.mean() if len(values) > 0 else 0
        except:
            return 0

    def _safe_std(self, df: pd.DataFrame, column: str) -> float:
        """Safely extract standard deviation from nested data"""
        try:
            values = df['data'].apply(lambda x: x.get(column, 0) if isinstance(x, dict) else 0)
            return values.std() if len(values) > 1 else 0
        except:
            return 0

    def _safe_max(self, df: pd.DataFrame, column: str) -> float:
        """Safely extract max from nested data"""
        try:
            values = df['data'].apply(lambda x: x.get(column, 0) if isinstance(x, dict) else 0)
            return values.max() if len(values) > 0 else 0
        except:
            return 0

    def _count_spikes(self, df: pd.DataFrame, column: str, threshold: float = 2) -> int:
        """Count number of spikes (values > threshold * std)"""
        try:
            values = df['data'].apply(lambda x: x.get(column, 0) if isinstance(x, dict) else 0)
            if len(values) < 3:
                return 0
            mean = values.mean()
            std = values.std()
            if std == 0:
                return 0
            z_scores = np.abs((values - mean) / std)
            return (z_scores > threshold).sum()
        except:
            return 0

    def _calculate_entropy(self, df: pd.DataFrame) -> float:
        """Calculate entropy of movement patterns"""
        try:
            if len(df) < 2:
                return 0
            # Use direction of movement as categories
            directions = df['data'].apply(lambda x: x.get('direction', 'unknown') if isinstance(x, dict) else 'unknown')
            probs = directions.value_counts(normalize=True)
            return stats.entropy(probs)
        except:
            return 0

    def _count_reversals(self, df: pd.DataFrame) -> int:
        """Count scroll direction reversals"""
        try:
            directions = df['data'].apply(lambda x: x.get('direction', '') if isinstance(x, dict) else '')
            reversals = 0
            for i in range(1, len(directions)):
                if directions.iloc[i] != directions.iloc[i-1] and directions.iloc[i] != '':
                    reversals += 1
            return reversals
        except:
            return 0

    def _detect_reading_pattern(self, scroll_events: pd.DataFrame) -> float:
        """Detect steady reading pattern (0-1 score)"""
        try:
            if len(scroll_events) < 3:
                return 0
            speeds = scroll_events['data'].apply(lambda x: x.get('scrollSpeed', 0) if isinstance(x, dict) else 0)
            # Reading pattern: slow, steady scrolling
            avg_speed = speeds.mean()
            speed_variance = speeds.std()
            if avg_speed > 0:
                reading_score = 1 / (1 + speed_variance / avg_speed)  # Lower variance = higher score
                return min(reading_score, 1.0)
            return 0
        except:
            return 0

    def _calculate_proximity_time(self, df: pd.DataFrame, event_type: str) -> float:
        """Calculate weighted proximity score based on recency and frequency"""
        proximity_events = df[df['type'] == event_type]
        if len(proximity_events) == 0:
            return 0

        # Weight recent events more heavily
        score = 0
        for i, event in proximity_events.iterrows():
            recency_weight = 1.0 - (i / len(df)) if len(df) > 0 else 1.0
            score += recency_weight

        return score

    def _calculate_exit_strength(self, df: pd.DataFrame) -> float:
        """Calculate strength of exit intent signals"""
        exit_events = df[df['type'].isin(['viewport_approach', 'mouse_exit', 'tab_switch'])]
        return len(exit_events)

    def _calculate_complexity(self, df: pd.DataFrame) -> float:
        """Calculate behavioral complexity score"""
        try:
            # More unique patterns = more complex behavior
            unique_sequences = set()
            for i in range(len(df) - 2):
                sequence = tuple(df['type'].iloc[i:i+3])
                unique_sequences.add(sequence)
            return len(unique_sequences) / max(len(df), 1)
        except:
            return 0

    def _detect_hesitations(self, df: pd.DataFrame) -> int:
        """Detect micro-hesitations in movement"""
        try:
            mouse_events = df[df['type'].str.contains('mouse', na=False)]
            if len(mouse_events) < 2:
                return 0

            velocities = mouse_events['data'].apply(lambda x: x.get('velocity', 0) if isinstance(x, dict) else 0)
            hesitations = 0
            for i in range(1, len(velocities)):
                # Sudden velocity drop = hesitation
                if velocities.iloc[i] < velocities.iloc[i-1] * 0.3:
                    hesitations += 1
            return hesitations
        except:
            return 0

    def _calculate_dwell_variance(self, df: pd.DataFrame) -> float:
        """Calculate variance in dwell times"""
        try:
            hover_events = df[df['type'] == 'element_hover']
            if len(hover_events) < 2:
                return 0
            durations = hover_events['data'].apply(lambda x: x.get('duration', 0) if isinstance(x, dict) else 0)
            return durations.std()
        except:
            return 0

    def _detect_exit_after_idle(self, df: pd.DataFrame) -> float:
        """Detect critical pattern: idle followed by exit"""
        try:
            score = 0
            for i in range(len(df) - 1):
                current = df.iloc[i]
                next_event = df.iloc[i+1]

                # Check for idle->exit pattern
                if current['type'] == 'idle' and next_event['type'] in ['mouse_exit', 'viewport_approach', 'mouse']:
                    idle_data = current.get('data', {})
                    if isinstance(idle_data, dict):
                        idle_duration = idle_data.get('duration', 0)
                        # More sensitive scoring
                        score = max(score, min(idle_duration / 1500, 1.0))  # Lower threshold

                # Also check for slow movement upward (exit intent)
                if current['type'] == 'mouse':
                    mouse_data = current.get('data', {})
                    if isinstance(mouse_data, dict):
                        if mouse_data.get('direction') == 'up' and mouse_data.get('velocity', 0) > 300:
                            score = max(score, 0.5)

            return score
        except:
            return 0

    def _calculate_price_hover_duration(self, df: pd.DataFrame) -> float:
        """Calculate total time hovering on price elements"""
        try:
            price_hovers = df[(df['type'] == 'element_hover') | (df['type'] == 'price_proximity')]
            total_duration = 0
            for _, event in price_hovers.iterrows():
                if isinstance(event.get('data'), dict):
                    if 'price' in str(event['data'].get('element', '')):
                        total_duration += event['data'].get('duration', 0)
            return min(total_duration / 5000, 1.0)  # Normalize
        except:
            return 0

    def _calculate_confident_scrolling(self, df: pd.DataFrame) -> float:
        """Detect confident, purposeful scrolling vs hesitant scrolling"""
        try:
            scroll_events = df[df['type'] == 'scroll']
            if len(scroll_events) < 2:
                return 0

            # Confident scrolling: consistent speed, same direction
            speeds = scroll_events['data'].apply(lambda x: x.get('scrollSpeed', 0) if isinstance(x, dict) else 0)
            directions = scroll_events['data'].apply(lambda x: x.get('direction', '') if isinstance(x, dict) else '')

            # Calculate consistency
            speed_consistency = 1 / (1 + speeds.std()) if len(speeds) > 1 else 0
            direction_consistency = len(directions[directions == directions.mode()[0]]) / len(directions) if len(directions) > 0 else 0

            return (speed_consistency + direction_consistency) / 2
        except:
            return 0

    def _detect_comparison_behavior(self, df: pd.DataFrame) -> float:
        """Detect comparison shopping patterns"""
        try:
            comparison_signals = 0

            # Tab switches
            comparison_signals += len(df[df['type'] == 'tab_switch']) * 0.3

            # Navigation proximity (looking for competitor links)
            comparison_signals += len(df[df['type'] == 'nav_proximity']) * 0.2

            # Price re-checks (returning to price after scrolling away)
            price_events = df[df['type'].str.contains('price', na=False)]
            if len(price_events) > 1:
                # Check for price revisits
                for i in range(1, len(price_events)):
                    time_diff = i  # Simplified - would use actual timestamps
                    if time_diff > 5:  # Returned to price after time away
                        comparison_signals += 0.5

            return min(comparison_signals, 1.0)
        except:
            return 0


class EmotionalIntelligence:
    """ML models for emotion detection and behavioral understanding"""

    def __init__(self):
        self.feature_extractor = BehavioralFeatureExtractor()
        self.scaler = StandardScaler()

        # Anomaly detection for unusual patterns
        self.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42
        )

        # Clustering for behavior segmentation
        self.behavior_clusterer = DBSCAN(
            eps=0.5,
            min_samples=3
        )

        # Pattern memory
        self.pattern_memory = defaultdict(deque)
        self.max_memory = 1000

        # Emotion thresholds (will be learned over time)
        self.emotion_rules = self._initialize_emotion_rules()

        # Session tracking
        self.sessions = {}

    def _initialize_emotion_rules(self) -> Dict:
        """Initialize enhanced emotion detection rules matching intervention triggers"""
        return {
            # Help Chat triggers
            'frustration': {
                'rage_click_count': (2, None),  # > 2 rage clicks
                'circular_motions': (3, None),   # > 3 circular motions
                'direction_changes': (8, None), # > 8 direction changes
                'velocity_variance': (150, None), # High velocity variance
                'acceleration_spikes': (2, None), # Multiple acceleration spikes
            },
            'confusion': {
                'pattern_complexity': (0.5, None),  # High complexity
                'circular_motions': (2, None),
                'unique_event_types': (7, None),
                'direction_changes': (5, None),
            },
            # Discount Modal triggers - ONLY for strong price reactions
            'price_shock': {
                'price_proximity_time': (1, None),  # Must have price proximity
                'acceleration_spikes': (2, None),   # Multiple spikes needed
                'exit_signal_strength': (1, None),  # Clear exit signal
                'price_hover_duration': (0.3, None),  # Significant hover
                'mouse_exit_after_idle': (0.5, None), # Strong exit pattern
            },
            'sticker_shock': {  # Frozen at price
                'price_proximity_time': (1, None),
                'viewport_approaches': (1, None),
                'idle_ratio': (0.4, None),  # High idle
                'price_hover_duration': (0.5, None),  # Long hover
            },
            # Trust Badge triggers
            'skeptical': {
                'scroll_reversals': (2, None),      # Re-reading behavior
                'micro_hesitations': (3, None),
                'dwell_time_variance': (50, None),
                'reading_pattern': (0.3, None),     # Slow, careful reading
            },
            'evaluation': {  # Careful evaluation behavior
                'reading_pattern': (0.4, None),
                'scroll_depth': (20, None),
                'micro_hesitations': (2, None),
                'text_selection': (0.5, None),
            },
            # Urgency Banner triggers
            'hesitation': {
                'micro_hesitations': (4, None),
                'idle_ratio': (0.25, None),
                'dwell_time_variance': (30, None),
                'cta_proximity_time': (0.5, None),  # Near CTA but hesitating
            },
            'cart_review': {  # Reviewing cart/checkout
                'form_proximity_time': (0.5, None),
                'scroll_reversals': (1, None),
                'cta_proximity_time': (1, None),
            },
            # Social Toast & Comparison Modal triggers
            'comparison_shopping': {
                'comparison_pattern_strength': (0.2, None),
                'price_proximity_time': (1, None),
                'text_selection': (0.5, None),
                'tab_switch': (0.5, None),
            },
            # Value Highlight trigger
            'cart_hesitation': {
                'form_proximity_time': (1, None),
                'micro_hesitations': (3, None),
                'cta_proximity_time': (1, None),
                'idle_ratio': (0.2, None),
            },
            # Comparison Modal trigger
            'anxiety': {
                'velocity_variance': (100, None),
                'direction_changes': (6, None),
                'micro_hesitations': (5, None),
                'pattern_complexity': (0.4, None),
            },
            # Exit Intent triggers
            'abandonment_intent': {
                'exit_signal_strength': (1, None),
                'viewport_approaches': (0.5, None),
                'idle_ratio': (0.3, None),
                'mouse_exit_after_idle': (0.3, None),
            },
            'exit_risk': {  # High risk of leaving
                'mouse_exit_after_idle': (0.4, None),
                'viewport_approaches': (1, None),
                'exit_signal_strength': (1.5, None),
            },
            # Positive engagement - most common state
            'engagement': {
                'reading_pattern': (0.3, None),  # Lower threshold for common state
                'scroll_depth': (20, None),  # Easier to achieve
                'session_duration': (5, None),  # Quick to detect
                'confident_scroll_rate': (0.3, None),
            },
            # Curiosity - default exploring state
            'curiosity': {
                'unique_event_types': (3, None),
                'pattern_complexity': (0.2, None),
                'scroll_depth': (10, None),
            },
        }

    async def process_session(self, session_id: str, events: List[dict]) -> Dict:
        """Process session events and return emotional state"""

        # Extract features
        features = self.feature_extractor.extract_features(events)

        # Store in session history
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'feature_history': [],
                'emotion_history': [],
                'cluster': None
            }

        self.sessions[session_id]['feature_history'].append(features)

        # Detect emotions
        emotions = self._detect_emotions(features)

        # Detect anomalies (unusual behavior)
        is_anomaly = self._detect_anomaly(features)
        if is_anomaly:
            emotions['confusion'] = max(emotions.get('confusion', 0), 0.7)

        # Get behavior cluster
        cluster = self._get_behavior_cluster(features)
        self.sessions[session_id]['cluster'] = cluster

        # Calculate confidence
        confidence = self._calculate_confidence(features, emotions)

        # Get dominant emotion
        dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0] if emotions else 'curiosity'

        # Store pattern for learning
        self._remember_pattern(features, dominant_emotion)

        return {
            'session_id': session_id,
            'dominant_emotion': dominant_emotion,
            'emotion_scores': emotions,
            'confidence': confidence,
            'is_anomaly': is_anomaly,
            'behavior_cluster': cluster,
            'features': features,
            'recommendations': self._get_intervention_recommendations(emotions)
        }

    def _detect_emotions(self, features: Dict[str, float]) -> Dict[str, float]:
        """Detect emotions from features with weighted scoring"""
        emotions = {}

        # Define weights for critical features per emotion
        feature_weights = {
            'price_shock': {
                'price_proximity_time': 2.0,
                'price_hover_duration': 1.5,
                'acceleration_spikes': 1.2,
                'mouse_exit_after_idle': 1.8
            },
            'sticker_shock': {
                'price_proximity_time': 2.0,
                'price_hover_duration': 1.8,
                'viewport_approaches': 1.3
            },
            'frustration': {
                'rage_click_count': 2.0,
                'circular_motions': 1.5,
                'velocity_variance': 1.2
            },
            'confusion': {
                'pattern_complexity': 1.8,
                'circular_motions': 1.5,
                'direction_changes': 1.3
            },
            'skeptical': {
                'scroll_reversals': 1.8,
                'micro_hesitations': 1.5,
                'reading_pattern': 1.3
            },
            'evaluation': {
                'reading_pattern': 1.8,
                'text_selection': 1.5,
                'micro_hesitations': 1.2
            },
            'hesitation': {
                'micro_hesitations': 2.0,
                'idle_ratio': 1.5,
                'cta_proximity_time': 1.3
            },
            'comparison_shopping': {
                'comparison_pattern_strength': 2.0,
                'price_proximity_time': 1.5,
                'tab_switch': 1.3
            },
            'abandonment_intent': {
                'mouse_exit_after_idle': 2.0,
                'exit_signal_strength': 1.5,
                'idle_ratio': 1.3
            },
            'exit_risk': {
                'mouse_exit_after_idle': 2.0,
                'viewport_approaches': 1.8,
                'exit_signal_strength': 1.5
            },
            'engagement': {
                'reading_pattern': 1.8,
                'scroll_depth': 1.5,
                'confident_scroll_rate': 1.3
            }
        }

        for emotion, rules in self.emotion_rules.items():
            score = 0
            total_weight = 0

            weights = feature_weights.get(emotion, {})

            for feature_name, (min_val, max_val) in rules.items():
                if feature_name in features:
                    value = features[feature_name]
                    weight = weights.get(feature_name, 1.0)

                    if min_val is not None and value >= min_val:
                        # Scale score based on how much it exceeds threshold
                        multiplier = min(2.0, value / min_val) if min_val > 0 else 1.0
                        score += weight * multiplier
                    elif max_val is not None and value <= max_val:
                        # Scale score based on how much below threshold
                        multiplier = min(2.0, max_val / value) if value > 0 else 1.0
                        score += weight * multiplier

                    total_weight += weight

            if total_weight > 0:
                emotions[emotion] = min(1.0, score / total_weight)

        # Price shock should only trigger with STRONG signals (not just any price proximity)
        price_signal_strength = features.get('price_proximity_time', 0) * features.get('acceleration_spikes', 0)
        if price_signal_strength > 1 and features.get('exit_signal_strength', 0) > 0:
            # Strong reaction to price: proximity + acceleration + exit intent
            emotions['price_shock'] = max(emotions.get('price_shock', 0), 0.8)
        elif features.get('price_hover_duration', 0) > 0.5 and features.get('idle_ratio', 0) > 0.3:
            # Sticker shock: long price hover + idle (frozen)
            emotions['sticker_shock'] = max(emotions.get('sticker_shock', 0), 0.7)

        # Boost abandonment if idle + exit pattern detected
        if features.get('mouse_exit_after_idle', 0) > 0.3:
            emotions['abandonment_intent'] = max(emotions.get('abandonment_intent', 0), 0.75)
            emotions['exit_risk'] = max(emotions.get('exit_risk', 0), 0.7)

        # Detect hesitation near CTA
        if features.get('cta_proximity_time', 0) > 0 and features.get('micro_hesitations', 0) > 2:
            emotions['hesitation'] = max(emotions.get('hesitation', 0), 0.6)

        # Detect cart/form hesitation
        if features.get('form_proximity_time', 0) > 0 and features.get('idle_ratio', 0) > 0.15:
            emotions['cart_hesitation'] = max(emotions.get('cart_hesitation', 0), 0.6)
            emotions['cart_review'] = max(emotions.get('cart_review', 0), 0.5)

        # Prioritize common emotions over edge cases
        # Engagement and curiosity should be the baseline states
        if features.get('scroll_depth', 0) > 10 or features.get('session_duration', 0) > 3:
            emotions['engagement'] = max(emotions.get('engagement', 0), 0.5)

        # Default to curiosity if nothing strong detected
        if not emotions or max(emotions.values()) < 0.4:
            emotions['curiosity'] = 0.6

        return emotions

    def _detect_anomaly(self, features: Dict[str, float]) -> bool:
        """Detect if behavior is anomalous"""
        try:
            # Need at least some training data
            if len(self.pattern_memory) < 10:
                return False

            # Convert to array
            feature_array = np.array(list(features.values())).reshape(1, -1)

            # Check if we have enough samples to fit
            if hasattr(self.anomaly_detector, 'fit'):
                # Get recent patterns for training
                recent_patterns = list(self.pattern_memory.values())[:100]
                if len(recent_patterns) > 5:
                    X = np.array([list(p[0].values()) for p in recent_patterns if p])
                    if X.shape[0] > 5:
                        self.anomaly_detector.fit(X)
                        prediction = self.anomaly_detector.predict(feature_array)
                        return prediction[0] == -1

            return False
        except:
            return False

    def _get_behavior_cluster(self, features: Dict[str, float]) -> Optional[int]:
        """Get behavior cluster for segmentation"""
        try:
            if len(self.pattern_memory) < 10:
                return None

            # Get recent patterns
            recent_patterns = list(self.pattern_memory.values())[:100]
            if len(recent_patterns) > 5:
                X = np.array([list(p[0].values()) for p in recent_patterns if p])
                if X.shape[0] > 5:
                    self.behavior_clusterer.fit(X)
                    feature_array = np.array(list(features.values())).reshape(1, -1)

                    # Predict cluster
                    distances = self.behavior_clusterer.fit_predict(
                        np.vstack([X, feature_array])
                    )
                    return distances[-1]

            return None
        except:
            return None

    def _calculate_confidence(self, features: Dict[str, float], emotions: Dict[str, float]) -> float:
        """Calculate confidence in emotion detection"""
        # Base confidence on feature strength
        base_confidence = 0.5

        # More features = higher confidence
        feature_count = sum(1 for v in features.values() if v > 0)
        base_confidence += min(feature_count * 0.02, 0.3)

        # Strong emotion signals = higher confidence
        if emotions:
            max_emotion_score = max(emotions.values())
            base_confidence += max_emotion_score * 0.2

        return min(base_confidence, 1.0)

    def _remember_pattern(self, features: Dict[str, float], emotion: str):
        """Store pattern for future learning"""
        if emotion not in self.pattern_memory:
            self.pattern_memory[emotion] = deque(maxlen=self.max_memory)

        self.pattern_memory[emotion].append((features, datetime.now()))

    def _get_intervention_recommendations(self, emotions: Dict[str, float]) -> List[str]:
        """Recommend interventions based on emotional state - aligned with real deployments"""
        recommendations = []

        # Map emotions to actual intervention deployments
        intervention_map = {
            # Discount Modal: price_shock, sticker_shock
            'price_shock': ['discount_modal'],
            'sticker_shock': ['discount_modal'],
            # Trust Badges: skeptical, evaluation
            'skeptical': ['trust_badges'],
            'evaluation': ['trust_badges'],
            # Urgency Banner: hesitation, cart_review
            'hesitation': ['urgency_banner'],
            'cart_review': ['urgency_banner'],
            # Social Toast: evaluation, comparison_shopping
            'comparison_shopping': ['social_toast', 'comparison_modal'],
            # Help Chat: confusion, frustration
            'confusion': ['help_chat'],
            'frustration': ['help_chat'],
            # Value Highlight: cart_hesitation
            'cart_hesitation': ['value_highlight'],
            # Comparison Modal: comparison_shopping, anxiety
            'anxiety': ['comparison_modal'],
            # Exit Intent: abandonment_intent, exit_risk
            'abandonment_intent': ['exit_intent'],
            'exit_risk': ['exit_intent'],
        }

        # Get recommendations based on emotion scores
        for emotion, score in emotions.items():
            # Use lower threshold for critical interventions
            threshold = 0.4 if emotion in ['abandonment_intent', 'exit_risk', 'price_shock'] else 0.5
            if score > threshold and emotion in intervention_map:
                recommendations.extend(intervention_map[emotion])

        return list(set(recommendations))  # Remove duplicates


class MLEmotionService:
    """Main service that connects to NATS and processes telemetry"""

    def __init__(self):
        self.nc = None
        self.intelligence = EmotionalIntelligence()
        self.event_buffer = defaultdict(list)
        self.max_buffer_size = 50
        self.last_process_time = defaultdict(float)
        self.process_debounce = 5.0  # Process at most every 5 seconds per session
        self.last_emotions = defaultdict(lambda: 'none')
        self.last_published = defaultdict(dict)  # Track last published state

    async def start(self):
        """Start the ML emotion service"""
        print("🧠 Starting ML Emotion Service...")
        print("📚 Learning from behavioral patterns...")
        print(f"⚡ Debounce: {self.process_debounce}s per session")
        print(f"📊 Publish threshold: 15% confidence delta")

        # Connect to NATS
        self.nc = await nats.connect("nats://localhost:4222")
        print("✅ Connected to NATS")

        # Subscribe to telemetry events
        sub = await self.nc.subscribe("TELEMETRY.events")
        print("📡 Listening for telemetry events...")

        # Process events
        async for msg in sub.messages:
            try:
                await self.process_message(msg)
            except Exception as e:
                print(f"❌ Error processing message: {e}")

    async def process_message(self, msg):
        """Process incoming telemetry message"""
        try:
            data = json.loads(msg.data.decode())

            # Handle batch or single event
            events = data.get('events', [data])

            # Debug: Log event types received
            if events:
                event_types = [e.get('type') for e in events]
                session_id = events[0].get('sessionId', 'unknown')
                if 'price' in str(event_types) or 'tab' in str(event_types):
                    print(f"📥 {session_id[-4:]}: {event_types}")

            for event in events:
                session_id = event.get('sessionId')
                if not session_id:
                    continue

                # Buffer events
                self.event_buffer[session_id].append(event)

                # Trim buffer
                if len(self.event_buffer[session_id]) > self.max_buffer_size:
                    self.event_buffer[session_id] = self.event_buffer[session_id][-self.max_buffer_size:]

                # Check debounce - don't process too frequently
                current_time = time.time()
                last_processed = self.last_process_time[session_id]
                time_since_last = current_time - last_processed

                # Process if we have enough events AND debounce time has passed
                # Lower threshold for critical events
                has_critical_events = any(e.get('type') in ['price_proximity', 'mouse_exit', 'viewport_approach', 'tab_switch']
                                         for e in self.event_buffer[session_id])
                min_events = 2 if has_critical_events else 3

                if len(self.event_buffer[session_id]) >= min_events and time_since_last >= self.process_debounce:
                    self.last_process_time[session_id] = current_time

                    result = await self.intelligence.process_session(
                        session_id,
                        self.event_buffer[session_id]
                    )

                    # Debug: log key features for price events
                    if any(e.get('type') in ['price_proximity', 'mouse_exit'] for e in self.event_buffer[session_id]):
                        features = result.get('features', {})
                        print(f"🔬 {session_id[-4:]}: price_prox={features.get('price_proximity_time', 0):.1f}, hover={features.get('price_hover_duration', 0):.1f}, exit={features.get('mouse_exit_after_idle', 0):.1f}")

                    # Check if this is a meaningful change before publishing
                    last_emotion = self.last_emotions[session_id]
                    current_emotion = result['dominant_emotion']

                    # Only publish if emotion changed significantly
                    should_publish = False
                    last_pub = self.last_published[session_id]

                    # Check if this is truly a new emotion or confidence change
                    if current_emotion != last_emotion:
                        should_publish = True
                    elif (current_emotion == last_pub.get('emotion') and
                          abs(result['confidence'] - last_pub.get('confidence', 0)) > 0.10):
                        should_publish = True  # Significant confidence change (10%+)
                    elif current_emotion in ['price_shock', 'sticker_shock', 'abandonment_intent', 'frustration', 'confusion'] and result['confidence'] > 0.65:
                        # Always publish critical emotions with good confidence
                        should_publish = True
                    elif current_emotion in ['engagement', 'curiosity'] and last_emotion == 'none':
                        # Always publish initial positive states
                        should_publish = True

                    if should_publish:
                        # Publish ML-enhanced emotion
                        await self.publish_emotion(result)
                        self.last_published[session_id] = {
                            'emotion': current_emotion,
                            'confidence': result['confidence']
                        }

                    # Update last emotion ALWAYS to prevent re-detection
                    if current_emotion != last_emotion:
                        self.last_emotions[session_id] = current_emotion

                        # Log all meaningful changes
                        if should_publish and result['confidence'] > 0.50:
                            # Add emotion details for critical states
                            details = ""
                            if current_emotion == 'price_shock':
                                details = " 💰"
                            elif current_emotion == 'abandonment_intent':
                                details = " 🚪"
                            elif current_emotion == 'frustration':
                                details = " 😤"
                            elif current_emotion == 'confusion':
                                details = " 🤔"
                            elif current_emotion == 'engagement':
                                details = " 📖"
                            elif current_emotion == 'comparison_shopping':
                                details = " 🔍"
                            elif current_emotion == 'skeptical':
                                details = " 🤨"
                            elif current_emotion == 'evaluation':
                                details = " 🧐"
                            elif current_emotion == 'hesitation':
                                details = " ⏸️"
                            elif current_emotion == 'cart_review':
                                details = " 🛒"
                            elif current_emotion == 'cart_hesitation':
                                details = " 🛒❓"
                            elif current_emotion == 'anxiety':
                                details = " 😰"
                            elif current_emotion == 'exit_risk':
                                details = " 🚨"
                            elif current_emotion == 'sticker_shock':
                                details = " 😱💰"

                            print(f"🎯 {session_id[-4:]}: {last_emotion} → {current_emotion}{details} ({result['confidence']*100:.0f}%)")

        except Exception as e:
            print(f"❌ Processing error: {e}")

    async def publish_emotion(self, result: Dict):
        """Publish ML-detected emotion to NATS"""
        emotion_event = {
            'sessionId': result['session_id'],
            'emotion': result['dominant_emotion'],
            'confidence': result['confidence'] * 100,  # Convert to percentage
            'ml_scores': result['emotion_scores'],
            'is_anomaly': result['is_anomaly'],
            'behavior_cluster': result['behavior_cluster'],
            'interventions': result['recommendations'],
            'source': 'ml',
            'timestamp': datetime.now().isoformat()
        }

        await self.nc.publish('EMOTIONS.state', json.dumps(emotion_event).encode())


async def main():
    """Main entry point"""
    service = MLEmotionService()
    await service.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 ML Emotion Service stopped")