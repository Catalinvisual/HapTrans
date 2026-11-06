/// Parses an Android versionCode from JSON or PackageInfo. Version codes are
/// numeric; version names must never participate in update eligibility.
int? parseVersionCode(dynamic raw) {
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  return int.tryParse(raw?.toString().trim() ?? '');
}

/// An update is offered only when the published code is strictly newer.
bool isUpdateAvailable({
  required int installedVersionCode,
  required int latestVersionCode,
}) =>
    latestVersionCode > installedVersionCode;