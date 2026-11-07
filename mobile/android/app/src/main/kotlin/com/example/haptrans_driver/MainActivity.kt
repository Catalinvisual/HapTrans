package com.example.hapcargo_driver

import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream
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

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example.hapcargo_driver/storage")
            .setMethodCallHandler { call, result ->
                val bytes = call.argument<ByteArray>("bytes")
                val fileName = call.argument<String>("fileName")
                val mimeType = call.argument<String>("mimeType") ?: "application/octet-stream"
                if (bytes == null || fileName.isNullOrBlank()) {
                    result.error("INVALID_ARGUMENT", "Missing file data or name", null)
                    return@setMethodCallHandler
                }
                try {
                    when (call.method) {
                        "saveToDownloads" -> result.success(saveToDownloads(fileName, mimeType, bytes))
                        "saveToGallery" -> result.success(saveToGallery(fileName, mimeType, bytes))
                        "open" -> {
                            val uri = call.argument<String>("uri")
                            if (uri.isNullOrBlank()) throw IllegalArgumentException("Missing file URI")
                            openSavedFile(Uri.parse(uri), mimeType)
                            result.success(true)
                        }
                        else -> result.notImplemented()
                    }
                } catch (error: SecurityException) {
                    result.error("PERMISSION_DENIED", error.message, null)
                } catch (error: Exception) {
                    result.error("STORAGE_FAILED", error.message, null)
                }
            }
    }

    private fun saveToDownloads(fileName: String, mimeType: String, bytes: ByteArray): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = applicationContext.contentResolver
            val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
            val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/HapCargo"
            val existing = findExisting(collection, fileName, relativePath)
            val uri = existing ?: resolver.insert(
                collection,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                },
            ) ?: throw IllegalStateException("Downloads storage is unavailable")
            resolver.openOutputStream(uri, "w")?.use { it.write(bytes) }
                ?: throw IllegalStateException("Cannot write downloaded file")
            resolver.update(
                uri,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.IS_PENDING, 0)
                    put(MediaStore.MediaColumns.DATE_MODIFIED, System.currentTimeMillis() / 1000)
                },
                null,
                null,
            )
            return uri.toString()
        }

        val directory = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "HapCargo")
        if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException("Cannot create Downloads folder")
        val file = File(directory, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        return Uri.fromFile(file).toString()
    }

    private fun saveToGallery(fileName: String, mimeType: String, bytes: ByteArray): String {
        if (!mimeType.startsWith("image/")) throw IllegalArgumentException("Only images can be saved to the gallery")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = applicationContext.contentResolver
            val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            val relativePath = "${Environment.DIRECTORY_PICTURES}/HapCargo"
            val existing = findExisting(collection, fileName, relativePath)
            val uri = existing ?: resolver.insert(
                collection,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                },
            ) ?: throw IllegalStateException("Gallery storage is unavailable")
            resolver.openOutputStream(uri, "w")?.use { it.write(bytes) }
                ?: throw IllegalStateException("Cannot write image")
            resolver.update(
                uri,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.IS_PENDING, 0)
                    put(MediaStore.MediaColumns.DATE_MODIFIED, System.currentTimeMillis() / 1000)
                },
                null,
                null,
            )
            return uri.toString()
        }

        val directory = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "HapCargo")
        if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException("Cannot create gallery folder")
        val file = File(directory, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        android.media.MediaScannerConnection.scanFile(applicationContext, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        return Uri.fromFile(file).toString()
    }

    private fun findExisting(collection: Uri, fileName: String, relativePath: String): Uri? {
        val projection = arrayOf(MediaStore.MediaColumns._ID)
        val selection = "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?"
        applicationContext.contentResolver.query(
            collection,
            projection,
            selection,
            arrayOf(fileName, "$relativePath/"),
            null,
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID))
                return Uri.withAppendedPath(collection, id.toString())
            }
        }
        return null
    }

    private fun openSavedFile(uri: Uri, mimeType: String) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }
}
