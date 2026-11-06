package com.example.hapcargo_driver

import android.content.pm.PackageManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example.hapcargo_driver/apk")
            .setMethodCallHandler { call, result ->
                if (call.method != "inspect") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                try {
                    val path = call.argument<String>("path")
                        ?: throw IllegalArgumentException("APK path missing")
                    val manager = packageManager
                    val archive = manager.getPackageArchiveInfo(path, PackageManager.GET_SIGNATURES)
                        ?: throw IllegalArgumentException("APK cannot be read")
                    val installed = manager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)

                    fun fingerprints(info: android.content.pm.PackageInfo): Set<String> {
                        val signatures = info.signatures ?: return emptySet()
                        return signatures.map { signature ->
                            MessageDigest.getInstance("SHA-256")
                                .digest(signature.toByteArray())
                                .joinToString("") { byte -> "%02x".format(byte) }
                        }.toSet()
                    }

                    val archiveSignatures = fingerprints(archive)
                    result.success(
                        mapOf(
                            "packageName" to archive.packageName,
                            "versionCode" to archive.versionCode,
                            "versionName" to archive.versionName,
                            "signatureMatches" to (archiveSignatures.isNotEmpty() && archiveSignatures == fingerprints(installed)),
                        ),
                    )
                } catch (error: Exception) {
                    result.error("APK_INSPECT_FAILED", error.message, null)
                }
            }
    }
}
