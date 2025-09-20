#!/usr/bin/env python3
"""
Behavioral Pattern Training Data

Teaches the ML model what different behavioral patterns look like.
Each pattern is a sequence of events that represents a specific emotional state.
"""

import json
from typing import List, Dict, Tuple
import numpy as np

class BehavioralPatternLibrary:
    """Library of known behavioral patterns for training"""

    def __init__(self):
        self.patterns = {
            'price_shock': self._generate_price_shock_patterns(),
            'abandonment_intent': self._generate_abandonment_patterns(),
            'confusion': self._generate_confusion_patterns(),
            'frustration': self._generate_frustration_patterns(),
            'engagement': self._generate_engagement_patterns(),
            'comparison_shopping': self._generate_comparison_patterns(),
            'trust_building': self._generate_trust_patterns(),
            'purchase_intent': self._generate_purchase_patterns(),
            'skepticism': self._generate_skepticism_patterns()
        }

    def _generate_price_shock_patterns(self) -> List[Dict]:
        """Generate various price shock behavioral patterns"""
        patterns = []

        # Pattern 1: Classic sticker shock - approach price, freeze, rapid exit
        patterns.append({
            'name': 'classic_sticker_shock',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 15}},
                {'type': 'price_proximity', 'data': {'distance': 100}},
                {'type': 'price_proximity', 'data': {'distance': 50}},
                {'type': 'mouse', 'data': {'velocity': 5, 'acceleration': -200}},  # Sudden stop
                {'type': 'idle', 'data': {'duration': 2000}},  # Freeze
                {'type': 'mouse', 'data': {'velocity': 800, 'direction': 'up'}},  # Rapid exit
                {'type': 'viewport_approach', 'data': {'edge': 'top'}}
            ],
            'confidence': 0.95
        })

        # Pattern 2: Price comparison shock - see price, tab switch immediately
        patterns.append({
            'name': 'price_comparison_shock',
            'sequence': [
                {'type': 'price_proximity', 'data': {'distance': 30}},
                {'type': 'element_hover', 'data': {'element': 'price', 'duration': 500}},
                {'type': 'tab_switch', 'data': {'delay': 100}},  # Immediate tab switch
                {'type': 'visibility_hidden', 'data': {}}
            ],
            'confidence': 0.85
        })

        # Pattern 3: Hesitant price shock - approach slowly, retreat slowly
        patterns.append({
            'name': 'hesitant_price_shock',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 8}},
                {'type': 'price_proximity', 'data': {'distance': 200}},
                {'type': 'mouse', 'data': {'velocity': 50}},  # Slow approach
                {'type': 'price_proximity', 'data': {'distance': 100}},
                {'type': 'micro_hesitation', 'data': {'duration': 500}},
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 12}},  # Retreat
                {'type': 'price_proximity', 'data': {'distance': 300}}  # Move away
            ],
            'confidence': 0.75
        })

        return patterns

    def _generate_abandonment_patterns(self) -> List[Dict]:
        """Generate abandonment intent patterns"""
        patterns = []

        # Pattern 1: Classic exit - idle then rapid upward movement
        patterns.append({
            'name': 'idle_to_exit',
            'sequence': [
                {'type': 'idle', 'data': {'duration': 5000}},  # Long idle
                {'type': 'mouse', 'data': {'velocity': 600, 'direction': 'up'}},
                {'type': 'viewport_approach', 'data': {'edge': 'top', 'distance': 50}},
                {'type': 'mouse_exit', 'data': {}}
            ],
            'confidence': 0.9
        })

        # Pattern 2: Frustrated exit - rage clicks then leave
        patterns.append({
            'name': 'frustrated_exit',
            'sequence': [
                {'type': 'rage_click', 'data': {'count': 3}},
                {'type': 'rage_click', 'data': {'count': 2}},
                {'type': 'circular_motion', 'data': {'radius': 100}},
                {'type': 'mouse', 'data': {'velocity': 700, 'direction': 'up'}},
                {'type': 'mouse_exit', 'data': {}}
            ],
            'confidence': 0.92
        })

        # Pattern 3: Comparison exit - navigate to header/nav for competitor search
        patterns.append({
            'name': 'comparison_exit',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 50}},
                {'type': 'nav_proximity', 'data': {'distance': 100}},
                {'type': 'element_hover', 'data': {'element': 'nav', 'duration': 1000}},
                {'type': 'tab_switch', 'data': {}}
            ],
            'confidence': 0.8
        })

        return patterns

    def _generate_confusion_patterns(self) -> List[Dict]:
        """Generate confusion behavioral patterns"""
        patterns = []

        # Pattern 1: Lost user - circular motions and random clicking
        patterns.append({
            'name': 'lost_user',
            'sequence': [
                {'type': 'circular_motion', 'data': {'radius': 150}},
                {'type': 'circular_motion', 'data': {'radius': 200}},
                {'type': 'click', 'data': {'random': True}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 30}},
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 35}},
                {'type': 'circular_motion', 'data': {'radius': 100}}
            ],
            'confidence': 0.85
        })

        # Pattern 2: Information overload - rapid direction changes
        patterns.append({
            'name': 'information_overload',
            'sequence': [
                {'type': 'direction_changes', 'data': {'count': 8}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 5}},
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 5}},
                {'type': 'direction_changes', 'data': {'count': 10}},
                {'type': 'idle', 'data': {'duration': 3000}}  # Overwhelmed pause
            ],
            'confidence': 0.78
        })

        return patterns

    def _generate_frustration_patterns(self) -> List[Dict]:
        """Generate frustration patterns"""
        patterns = []

        # Pattern 1: Classic rage - multiple rage clicks
        patterns.append({
            'name': 'rage_clicking',
            'sequence': [
                {'type': 'click', 'data': {}},
                {'type': 'rage_click', 'data': {'count': 3, 'interval': 200}},
                {'type': 'rage_click', 'data': {'count': 4, 'interval': 150}},
                {'type': 'mouse', 'data': {'velocity': 500, 'acceleration': 300}}
            ],
            'confidence': 0.95
        })

        # Pattern 2: Form frustration - field issues
        patterns.append({
            'name': 'form_frustration',
            'sequence': [
                {'type': 'field_interaction', 'data': {'field': 'email'}},
                {'type': 'field_clear', 'data': {'field': 'email'}},
                {'type': 'field_interaction', 'data': {'field': 'email'}},
                {'type': 'rage_click', 'data': {'count': 2}},
                {'type': 'field_abandonment', 'data': {}}
            ],
            'confidence': 0.88
        })

        return patterns

    def _generate_engagement_patterns(self) -> List[Dict]:
        """Generate positive engagement patterns"""
        patterns = []

        # Pattern 1: Deep reading - steady scroll with time on page
        patterns.append({
            'name': 'deep_reading',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 10}},
                {'type': 'idle', 'data': {'duration': 3000}},  # Reading pause
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 8}},
                {'type': 'text_selection', 'data': {}},
                {'type': 'idle', 'data': {'duration': 4000}},  # Reading selected text
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 12}}
            ],
            'confidence': 0.9
        })

        # Pattern 2: Confident exploration - smooth navigation
        patterns.append({
            'name': 'confident_exploration',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 20}},
                {'type': 'element_hover', 'data': {'element': 'cta', 'duration': 1500}},
                {'type': 'click', 'data': {'element': 'cta'}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 15}},
                {'type': 'element_hover', 'data': {'element': 'feature', 'duration': 2000}}
            ],
            'confidence': 0.85
        })

        return patterns

    def _generate_comparison_patterns(self) -> List[Dict]:
        """Generate comparison shopping patterns"""
        patterns = []

        # Pattern 1: Tab comparison - switching between competitors
        patterns.append({
            'name': 'tab_comparison',
            'sequence': [
                {'type': 'price_proximity', 'data': {'distance': 50}},
                {'type': 'element_hover', 'data': {'element': 'price', 'duration': 2000}},
                {'type': 'tab_switch', 'data': {}},
                {'type': 'visibility_hidden', 'data': {'duration': 5000}},
                {'type': 'visibility_visible', 'data': {}},
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 30}}
            ],
            'confidence': 0.82
        })

        # Pattern 2: Feature comparison - checking multiple features
        patterns.append({
            'name': 'feature_comparison',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 25}},
                {'type': 'element_hover', 'data': {'element': 'feature_1', 'duration': 1000}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 20}},
                {'type': 'element_hover', 'data': {'element': 'feature_2', 'duration': 1000}},
                {'type': 'nav_proximity', 'data': {}},
                {'type': 'element_hover', 'data': {'element': 'pricing_link', 'duration': 1500}}
            ],
            'confidence': 0.78
        })

        return patterns

    def _generate_trust_patterns(self) -> List[Dict]:
        """Generate trust-building behavior patterns"""
        patterns = []

        # Pattern 1: Security verification - checking badges and guarantees
        patterns.append({
            'name': 'security_verification',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 15}},
                {'type': 'element_hover', 'data': {'element': 'security_badge', 'duration': 3000}},
                {'type': 'click', 'data': {'element': 'guarantee'}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 10}},
                {'type': 'element_hover', 'data': {'element': 'testimonial', 'duration': 2500}}
            ],
            'confidence': 0.8
        })

        return patterns

    def _generate_purchase_patterns(self) -> List[Dict]:
        """Generate purchase intent patterns"""
        patterns = []

        # Pattern 1: Confident purchase - direct path to checkout
        patterns.append({
            'name': 'confident_purchase',
            'sequence': [
                {'type': 'cta_proximity', 'data': {'distance': 50}},
                {'type': 'element_hover', 'data': {'element': 'add_to_cart', 'duration': 500}},
                {'type': 'click', 'data': {'element': 'add_to_cart'}},
                {'type': 'form_proximity', 'data': {}},
                {'type': 'field_interaction', 'data': {'field': 'email'}},
                {'type': 'field_interaction', 'data': {'field': 'name'}}
            ],
            'confidence': 0.92
        })

        return patterns

    def _generate_skepticism_patterns(self) -> List[Dict]:
        """Generate skepticism patterns"""
        patterns = []

        # Pattern 1: Re-reading and verification
        patterns.append({
            'name': 'content_verification',
            'sequence': [
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 15}},
                {'type': 'scroll', 'data': {'direction': 'up', 'scrollSpeed': 20}},  # Scroll back
                {'type': 'idle', 'data': {'duration': 3000}},  # Re-read
                {'type': 'element_hover', 'data': {'element': 'fine_print', 'duration': 4000}},
                {'type': 'scroll', 'data': {'direction': 'down', 'scrollSpeed': 5}}  # Slow careful scroll
            ],
            'confidence': 0.75
        })

        return patterns

    def get_training_data(self) -> List[Tuple[List[Dict], str, float]]:
        """Get all training data as (sequence, emotion, confidence) tuples"""
        training_data = []

        for emotion, pattern_list in self.patterns.items():
            for pattern in pattern_list:
                training_data.append((
                    pattern['sequence'],
                    emotion,
                    pattern['confidence']
                ))

        return training_data

    def export_for_training(self, filepath: str):
        """Export training data to JSON file"""
        training_data = []

        for emotion, pattern_list in self.patterns.items():
            for pattern in pattern_list:
                training_data.append({
                    'emotion': emotion,
                    'pattern_name': pattern['name'],
                    'sequence': pattern['sequence'],
                    'confidence': pattern['confidence']
                })

        with open(filepath, 'w') as f:
            json.dump(training_data, f, indent=2)

        print(f"✅ Exported {len(training_data)} training patterns to {filepath}")


class PatternSimulator:
    """Simulates behavioral patterns with realistic variations"""

    def __init__(self):
        self.library = BehavioralPatternLibrary()

    def add_noise(self, pattern: List[Dict], noise_level: float = 0.1) -> List[Dict]:
        """Add realistic noise to a pattern"""
        noisy_pattern = []

        for event in pattern:
            noisy_event = event.copy()

            # Add noise to numeric values
            if 'data' in noisy_event:
                for key, value in noisy_event['data'].items():
                    if isinstance(value, (int, float)):
                        # Add gaussian noise
                        noise = np.random.normal(0, value * noise_level)
                        noisy_event['data'][key] = value + noise

            noisy_pattern.append(noisy_event)

            # Occasionally insert random events (real user behavior)
            if np.random.random() < 0.15:  # 15% chance
                random_event = {
                    'type': np.random.choice(['mouse', 'idle', 'scroll']),
                    'data': {'random': True}
                }
                noisy_pattern.append(random_event)

        return noisy_pattern

    def generate_variations(self, pattern: List[Dict], num_variations: int = 10) -> List[List[Dict]]:
        """Generate multiple variations of a pattern"""
        variations = []

        for _ in range(num_variations):
            # Vary the noise level
            noise_level = np.random.uniform(0.05, 0.2)
            variation = self.add_noise(pattern, noise_level)

            # Occasionally skip events (incomplete patterns)
            if np.random.random() < 0.2:  # 20% chance
                skip_index = np.random.randint(0, len(variation))
                variation = variation[:skip_index] + variation[skip_index+1:]

            variations.append(variation)

        return variations

    def generate_training_dataset(self, samples_per_pattern: int = 50) -> List[Tuple[List[Dict], str, float]]:
        """Generate a full training dataset with variations"""
        dataset = []
        base_patterns = self.library.get_training_data()

        for sequence, emotion, confidence in base_patterns:
            # Add original pattern
            dataset.append((sequence, emotion, confidence))

            # Generate variations
            variations = self.generate_variations(sequence, samples_per_pattern)
            for variation in variations:
                # Slightly reduce confidence for variations
                varied_confidence = confidence * np.random.uniform(0.85, 1.0)
                dataset.append((variation, emotion, varied_confidence))

        print(f"📊 Generated {len(dataset)} training samples from {len(base_patterns)} base patterns")
        return dataset


if __name__ == "__main__":
    # Create pattern library
    library = BehavioralPatternLibrary()

    # Export base patterns
    library.export_for_training('/tmp/behavioral_patterns.json')

    # Generate training dataset with variations
    simulator = PatternSimulator()
    training_data = simulator.generate_training_dataset(samples_per_pattern=20)

    print(f"\n🧠 Training data ready:")
    print(f"   Total samples: {len(training_data)}")

    # Count samples per emotion
    emotion_counts = {}
    for _, emotion, _ in training_data:
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

    print(f"\n📊 Samples per emotion:")
    for emotion, count in sorted(emotion_counts.items()):
        print(f"   {emotion}: {count} samples")