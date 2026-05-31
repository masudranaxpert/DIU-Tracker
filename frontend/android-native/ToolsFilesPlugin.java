package com.diucse.academictracker.plugins;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.provider.DocumentsContract;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "ToolsFiles")
public class ToolsFilesPlugin extends Plugin {

    private static final String DEFAULT_FOLDER = "DIU Tracker Tools";

    private File resolveToolsFile(String fileName) {
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File toolsDir = new File(downloadDir, DEFAULT_FOLDER);
        return new File(toolsDir, fileName);
    }

    private File resolveToolsFolder(String folderName) {
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File folder = new File(downloadDir, folderName);
        if (!folder.exists()) {
            folder.mkdirs();
        }
        return folder;
    }

    @PluginMethod
    public void openPdf(PluginCall call) {
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("fileName is required");
            return;
        }

        File pdfFile = resolveToolsFile(fileName);
        if (!pdfFile.exists()) {
            call.reject("File not found in Download/" + DEFAULT_FOLDER);
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                pdfFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeFor(fileName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No viewer app found on this device");
        } catch (Exception e) {
            call.reject("Could not open file: " + e.getMessage());
        }
    }

    private String mimeFor(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/pdf";
    }

    @PluginMethod
    public void openToolsFolder(PluginCall call) {
        String folderName = call.getString("folderName", DEFAULT_FOLDER);
        resolveToolsFolder(folderName);

        String docId = "primary:Download/" + folderName;

        if (tryOpenDocumentFolder(docId)) {
            call.resolve();
            return;
        }

        if (tryOpenDocumentFolderUri(
            "content://com.android.externalstorage.documents/document/" + Uri.encode(docId)
        )) {
            call.resolve();
            return;
        }

        if (tryOpenDocumentFolder("primary:Download")) {
            call.resolve();
            return;
        }

        call.reject("Could not open Download/" + folderName + ". Open Files app and go to Download.");
    }

    private boolean tryOpenDocumentFolder(String docId) {
        try {
            Uri uri = DocumentsContract.buildDocumentUri(
                "com.android.externalstorage.documents",
                docId
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "vnd.android.document/directory");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean tryOpenDocumentFolderUri(String uriString) {
        try {
            Uri uri = Uri.parse(uriString);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "vnd.android.document/directory");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
