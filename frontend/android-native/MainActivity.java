package com.diucse.academictracker;

import android.os.Bundle;

import com.diucse.academictracker.plugins.ToolsFilesPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ToolsFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
