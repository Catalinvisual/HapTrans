import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:hapcargo_driver/utils/status_colors.dart';
import 'package:hapcargo_driver/utils/trip_status.dart';

/// The semantic palette must follow the canonical status code, never the
/// translated label. These tests lock the operational distinctions the TMS and
/// the driver app rely on.
void main() {
  const expected = <String, StatusToneName>{
    'planning': StatusToneName.neutral,
    'planned': StatusToneName.neutral,
    'draft': StatusToneName.neutral,
    'assigned': StatusToneName.assigned,
    'dispatched': StatusToneName.assigned,
    'driver_accepted': StatusToneName.accepted,
    'confirmed': StatusToneName.accepted,
    'started': StatusToneName.progress,
    'driving': StatusToneName.progress,
    'driving_to_delivery': StatusToneName.progress,
    'arrived': StatusToneName.arrived,
    'at_delivery': StatusToneName.arrived,
    'loading': StatusToneName.loading,
    'loaded': StatusToneName.loaded,
    'unloading': StatusToneName.unloading,
    'unloaded': StatusToneName.unloaded,
    'waiting_documents': StatusToneName.documents,
    'completed': StatusToneName.completed,
    'delivered': StatusToneName.completed,
    'delayed': StatusToneName.delayed,
    'exception': StatusToneName.exception,
    'problem': StatusToneName.exception,
    'cancelled': StatusToneName.cancelled,
    'rejected': StatusToneName.rejected,
  };

  test('every canonical status resolves to its semantic tone', () {
    for (final entry in expected.entries) {
      expect(statusToneName(entry.key), entry.value, reason: entry.key);
    }
  });

  test('planning, assigned and accepted stay distinct', () {
    final planning = statusTone('planning');
    final assigned = statusTone('assigned');
    final accepted = statusTone('driver_accepted');
    expect(planning.background, isNot(assigned.background));
    expect(assigned.background, isNot(accepted.background));
    expect(assigned.foreground, isNot(accepted.foreground));
  });

  test('driving, unloading and unloaded stay distinct', () {
    final driving = statusTone('driving');
    final unloading = statusTone('unloading');
    final unloaded = statusTone('unloaded');
    expect(driving.background, isNot(unloading.background));
    expect(unloading.background, isNot(unloaded.background));
    expect(driving.background, isNot(unloaded.background));
  });

  test('delayed and exception are different reds', () {
    expect(statusTone('delayed').background, isNot(statusTone('exception').background));
    expect(statusTone('exception').accent, isNot(statusTone('delayed').accent));
  });

  test('cancelled and rejected stay distinguishable from completed', () {
    expect(statusTone('cancelled').background, isNot(statusTone('rejected').background));
    expect(statusTone('cancelled').background, isNot(statusTone('completed').background));
  });

  test('the full palette is defined and palettes are not empty', () {
    for (final tone in StatusToneName.values) {
      expect(statusTones[tone], isNotNull, reason: tone.name);
    }
    expect(statusTones[StatusToneName.unloading]!.background, const Color(0xFFF3E8FF));
    expect(statusTones[StatusToneName.unloading]!.foreground, const Color(0xFF7E22CE));
    expect(statusTones[StatusToneName.neutral]!.background, const Color(0xFFF1F5F9));
  });

  test('one status keeps one colour in all seven languages', () {
    const locales = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
    final reference = statusTone('unloading');
    for (final locale in locales) {
      for (final entry in expected.entries) {
        expect(statusToneName(entry.key), entry.value, reason: '$locale/${entry.key}');
      }
      expect(statusTone('unloading').background, reference.background, reason: locale);
      expect(statusTone('unloading').foreground, reference.foreground, reason: locale);
      expect(tripStatusLabel('unloading', locale), isNotEmpty, reason: locale);
      expect(stopStatusLabel('unloading', locale), isNotEmpty, reason: locale);
    }
  });

  test('unknown and empty statuses fall back to neutral', () {
    expect(statusToneName('not_a_real_status'), StatusToneName.neutral);
    expect(statusToneName(null), StatusToneName.neutral);
    expect(statusToneName(''), StatusToneName.neutral);
  });
}
