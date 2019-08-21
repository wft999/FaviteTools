// Copyright (c) 2013 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include <windows.h>
#include "shellapi.h" 
#include <psapi.h>


#include "include/cef_sandbox_win.h"
#include "simple_app.h"

// When generating projects with CMake the CEF_USE_SANDBOX value will be defined
// automatically if using the required compiler version. Pass -DUSE_SANDBOX=OFF
// to the CMake command-line to disable use of the sandbox.
// Uncomment this line to manually enable sandbox support.
// #define CEF_USE_SANDBOX 1

#if defined(CEF_USE_SANDBOX)
// The cef_sandbox.lib static library may not link successfully with all VS
// versions.
#pragma comment(lib, "cef_sandbox.lib")
#endif



void startPython(){
	STARTUPINFO si;
    PROCESS_INFORMATION pi;

	char szFilePath[MAX_PATH + 1]={0};  
    GetModuleFileNameA(NULL, szFilePath, MAX_PATH);  
    (strrchr(szFilePath, '\\'))[0] = 0;
	(strrchr(szFilePath, '\\'))[0] = 0; 

	char szNginxFile[MAX_PATH + 1]={0}; 
	sprintf(szNginxFile,"%s\\nginx\\nginx.exe",szFilePath);
	//int sBufSize = strlen(szNginxFile);
    //DWORD dBufSize=MultiByteToWideChar(CP_ACP, 0, szNginxFile, sBufSize, NULL, 0);
    wchar_t * dNginxFile=new wchar_t[MAX_PATH];
    wmemset(dNginxFile, 0, MAX_PATH);
	int nRet = MultiByteToWideChar(CP_ACP, 0, szNginxFile, (int)strlen(szNginxFile), dNginxFile, MAX_PATH);

	char szNginx[MAX_PATH + 1]={0}; 
	sprintf(szNginx,"%s\\nginx",szFilePath);
    wchar_t * dNginx=new wchar_t[MAX_PATH];
    wmemset(dNginx, 0, MAX_PATH);
    nRet=MultiByteToWideChar(CP_ACP, 0, szNginx, (int)strlen(szNginx), dNginx, MAX_PATH);

    ZeroMemory( &si, sizeof(si) );
    si.cb = sizeof(si);
    ZeroMemory( &pi, sizeof(pi) );
	CreateProcess( dNginxFile,   // No module name (use command line)
        NULL,        // Command line
        NULL,           // Process handle not inheritable
        NULL,           // Thread handle not inheritable
        FALSE,          // Set handle inheritance to FALSE
        CREATE_NO_WINDOW,              // No creation flags
        NULL,           // Use parent's environment block
        dNginx,           // Use parent's starting directory 
        &si,            // Pointer to STARTUPINFO structure
        &pi ); 
	delete(dNginxFile);
	delete(dNginx);

	char szPython[MAX_PATH + 1]={0}; 
	sprintf(szPython,"%s\\python\\python.exe",szFilePath);
    wchar_t * dPython=new wchar_t[MAX_PATH];
    wmemset(dPython, 0, MAX_PATH);
    nRet=MultiByteToWideChar(CP_ACP, 0, szPython, (int)strlen(szPython), dPython, MAX_PATH);

	char szCommand[MAX_PATH + 1]={0}; 
	sprintf(szCommand,"%s\\python\\python.exe %s\\server\\odoo-bin",szFilePath,szFilePath);
    wchar_t * dCommand=new wchar_t[MAX_PATH];
    wmemset(dCommand, 0, MAX_PATH);
    nRet=MultiByteToWideChar(CP_ACP, 0, szCommand, (int)strlen(szCommand), dCommand, MAX_PATH);

	char szOdoo[MAX_PATH + 1]={0}; 
	sprintf(szOdoo,"%s\\server",szFilePath);
    wchar_t * dOdoo=new wchar_t[MAX_PATH];
    wmemset(dOdoo, 0, MAX_PATH);
    nRet=MultiByteToWideChar(CP_ACP, 0, szOdoo, (int)strlen(szOdoo), dOdoo, MAX_PATH);

	CreateProcess( dPython,   // No module name (use command line)
        dCommand,        // Command line
        NULL,           // Process handle not inheritable
        NULL,           // Thread handle not inheritable
        FALSE,          // Set handle inheritance to FALSE
        CREATE_NO_WINDOW,              // No creation flags
        NULL,           // Use parent's environment block
        dOdoo,           // Use parent's starting directory 
        &si,            // Pointer to STARTUPINFO structure
        &pi ); 

	delete(dPython);
	delete(dCommand);
	delete(dOdoo);
}

void stopPython(){
	system("taskkill /f /t /im nginx.exe");
	system("taskkill /f /t /im python.exe");
}

// Entry point function for all processes.
int APIENTRY wWinMain(HINSTANCE hInstance,
                      HINSTANCE hPrevInstance,
                      LPTSTR lpCmdLine,
                      int nCmdShow) {
  UNREFERENCED_PARAMETER(hPrevInstance);
  UNREFERENCED_PARAMETER(lpCmdLine);


  // Enable High-DPI support on Windows 7 or newer.
  CefEnableHighDPISupport();

  void* sandbox_info = NULL;

#if defined(CEF_USE_SANDBOX)
  // Manage the life span of the sandbox information object. This is necessary
  // for sandbox support on Windows. See cef_sandbox_win.h for complete details.
  CefScopedSandboxInfo scoped_sandbox;
  sandbox_info = scoped_sandbox.sandbox_info();
#endif

  // Provide CEF with command-line arguments.
  CefMainArgs main_args(hInstance);

  // CEF applications have multiple sub-processes (render, plugin, GPU, etc)
  // that share the same executable. This function checks the command-line and,
  // if this is a sub-process, executes the appropriate logic.
  int exit_code = CefExecuteProcess(main_args, NULL, sandbox_info);
  if (exit_code >= 0) {
    // The sub-process has completed so return here.
    return exit_code;
  }

  startPython();

  // Specify CEF global settings here.
  CefSettings settings;
  settings.remote_debugging_port = 8088;

#if !defined(CEF_USE_SANDBOX)
  settings.no_sandbox = true;
#endif

  // SimpleApp implements application-level callbacks for the browser process.
  // It will create the first browser instance in OnContextInitialized() after
  // CEF has initialized.
  CefRefPtr<SimpleApp> app(new SimpleApp);

  // Initialize CEF.
  CefInitialize(main_args, settings, app.get(), sandbox_info);

  // Run the CEF message loop. This will block until CefQuitMessageLoop() is
  // called.
  CefRunMessageLoop();

  // Shut down CEF.
  CefShutdown();

  stopPython();

  return 0;
}
